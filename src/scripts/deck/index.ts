// The journey deck's page script (deck spec §3, §7, §9). It runs in the initial bundle and stays
// small: decide the tier, wire the rail, bind Motion's scroll(), prefetch the stage chunk after
// the first scroll, mount it when the journey is on screen, mirror the stage's state into data
// attributes, and hand the section to the timeline when anything is missing.
import { scroll } from "motion";
import { career } from "../../data/career";
import { judgeSwipe, orientationTilt, screenAngleOf, type Orientation } from "./deck-gestures";
import { cardModel, setDeckFontFamily } from "./deck-paint";
import { DECK_PARAMS } from "./deck-params";
import { initRail, scrollToRank } from "./deck-rail";
import type { StageHandle, StagePortrait, StageState } from "./deck-stage";
import { detectTier, readTierEnv } from "./deck-tier";
import { idle, nowFrom, once, parseFreeze, pickRendition } from "./deck-util";

function fallback(root: HTMLElement, track: HTMLElement): void {
  root.setAttribute("data-deck-fallback", "");
  track.dataset.deckState = "fallback";
  delete track.dataset.deckReady;
  delete track.dataset.deckRank;
  delete track.dataset.deckPhase;
  delete track.dataset.deckEnergy;
  delete track.dataset.deckVram;
  delete track.dataset.deckSlots;
  delete track.dataset.deckBloom;
  delete track.dataset.deckCornerAlpha;
  delete track.dataset.deckTilt;
}

/**
 * The Fonts API registers JetBrains Mono under a hashed family name, so canvas text has to read
 * the real family from the page's `--font-jetbrains` custom property rather than a literal. Sets
 * it on `deck-paint`'s painters, then waits for the three weights the cards draw with to settle
 * (a failed load still resolves, via `allSettled`, so a slow font never blocks the stage).
 */
async function loadDeckFont(): Promise<void> {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains");
  const first =
    raw
      .split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? "";
  const family = first || "monospace";
  setDeckFontFamily(family);
  await Promise.allSettled(
    [`400 14px "${family}"`, `italic 400 10px "${family}"`, `700 12px "${family}"`].map((f) =>
      document.fonts.load(f),
    ),
  );
}

export function initDeck(): void {
  const root = document.querySelector<HTMLElement>("[data-deck-root]");
  const track = root?.querySelector<HTMLElement>("[data-deck]");
  const canvas = track?.querySelector<HTMLCanvasElement>("[data-deck-gl]");
  const stage = track?.querySelector<HTMLElement>(".journey__stage");
  const column = track?.querySelector<HTMLElement>("[data-deck-column]");
  if (!root || !track || !canvas || !stage || !column) return;

  const tier = detectTier(readTierEnv());
  if (tier === "none") {
    fallback(root, track);
    return;
  }
  track.dataset.deckTier = tier;

  const coarse = matchMedia("(pointer: coarse)").matches;
  const hint = track.querySelector<HTMLElement>("[data-deck-hint]");
  if (coarse && hint) hint.textContent = "↓ scroll, swipe or pick a rank";

  // A synchronous throw anywhere below (setup, not the async `mount`, which has its own try/catch
  // via `giveUp`) must still hand the section to the timeline rather than leave the pinned track
  // blank forever.
  try {
    const count = career.length;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const freeze = parseFreeze(location.search);
    const now = freeze ? new Date(freeze.time) : nowFrom(track.dataset.now);
    const cards = career.map((s) => cardModel(s, now));
    const labels = career.map((s) => s.rankLabel);

    let targetP = 0;
    let handle: StageHandle | null = null;
    let mounting = false;
    let intersecting = false;
    let introPlayed = false;
    // -1, not 0: rank E is index 0 too, and the first state update must still reach
    // rail.setPresented so the aria-live region announces the landing rank.
    let presented = -1;
    let hintShown = false;
    let gaveUp = false;
    let hasScrolled = false;
    let disposeTimer: ReturnType<typeof setTimeout> | undefined;
    let stageModule: Promise<typeof import("./deck-stage")> | null = null;
    const loadStage = () => (stageModule ??= import("./deck-stage"));

    const jump = (index: number) => {
      rail.hideHint();
      scrollToRank(track, index, count, reduced);
    };
    const rail = initRail(track, career, jump);
    // The rail's dataset keys keep their literal hyphens: a "-" followed by a digit is never
    // camelCased by the DOMStringMap algorithm, so `data-portrait-1x` reads back as
    // `dataset["portrait-1x"]`, not `dataset.portrait1x`.
    const portraits: StagePortrait[] = rail.buttons.map((b) => ({
      x1: b.dataset["portrait-1x"] ?? null,
      x2: b.dataset["portrait-2x"] ?? null,
      glow: b.dataset.glow ?? null,
    }));

    const onState = (state: StageState) => {
      track.dataset.deckState = state.state;
      track.dataset.deckRank = state.rank;
      track.dataset.deckPhase = state.phase;
      track.dataset.deckEnergy = state.energy.toFixed(2);
      track.dataset.deckVram = String(state.vram);
      if (state.slots) track.dataset.deckSlots = state.slots;
      else delete track.dataset.deckSlots;
      track.dataset.deckBloom = state.bloom ? "on" : "off";
      if (state.cornerAlpha !== null) track.dataset.deckCornerAlpha = String(state.cornerAlpha);
      else delete track.dataset.deckCornerAlpha;
      const index = labels.indexOf(state.rank);
      if (state.state === "scroll" && !hintShown && !freeze) {
        hintShown = true;
        rail.showHint();
      }
      if (index !== presented) {
        // Never hide the hint on the very first state update: `presented` starting at -1 means
        // this transition is the deck announcing where it landed, not the visitor moving past it.
        const wasUnset = presented === -1;
        presented = index;
        rail.setPresented(index);
        if (hintShown && !wasUnset) rail.hideHint();
      }
    };

    // deviceorientation (spec §7, §13): listened to only after a tap on the presented card. iOS
    // asks once, inside that tap's gesture; a denial ends it silently. The baseline is the first
    // reading after enabling (or after a rotation), so the phone's resting angle is "flat".
    type Permission = "granted" | "denied" | "prompt";
    interface OrientationCtor {
      requestPermission?: () => Promise<Permission>;
    }
    let permission: Permission | "unknown" | "asking" = "unknown";
    let orientationOn = false;
    let baseline: Orientation | null = null;
    let baselineAngle = 0;
    const setTiltState = (on: boolean): void => {
      orientationOn = on;
      track.dataset.deckTilt = on ? "on" : "off";
      if (!on) {
        baseline = null;
        handle?.tilt(null, null);
      }
    };
    const onOrientation = (event: DeviceOrientationEvent): void => {
      if (!orientationOn || !handle) return;
      const reading = { beta: event.beta ?? Number.NaN, gamma: event.gamma ?? Number.NaN };
      if (!Number.isFinite(reading.beta) || !Number.isFinite(reading.gamma)) return;
      const angle = screenAngleOf(screen.orientation?.angle ?? 0);
      // A rotation turns the device's axes against the screen's: measured from the old angle's
      // baseline, the turn itself reads as a full tilt and pins the card at the limits. Re-capture.
      if (!baseline || angle !== baselineAngle) {
        baseline = reading;
        baselineAngle = angle;
      }
      const t = orientationTilt(reading, baseline, angle);
      handle.tilt(t.x, t.y);
    };
    const stopOrientation = (): void => {
      if (!orientationOn) return;
      removeEventListener("deviceorientation", onOrientation);
      setTiltState(false);
    };
    const enableOrientation = async (): Promise<void> => {
      // The stage reads the external tilt only in phone mode: an iPad in landscape or a touch
      // laptop would be prompted for a tilt that never moves anything (deck-input.ts).
      if (matchMedia("(min-width: 60rem)").matches) return;
      if (orientationOn || permission === "denied" || permission === "asking") return;
      const ctor = (globalThis as unknown as { DeviceOrientationEvent?: OrientationCtor })
        .DeviceOrientationEvent;
      if (!ctor) return;
      if (typeof ctor.requestPermission === "function" && permission !== "granted") {
        permission = "asking";
        try {
          permission = await ctor.requestPermission();
        } catch {
          permission = "denied";
        }
        if (permission !== "granted") {
          permission = "denied";
          return;
        }
        // Whatever wanted the tilt may be gone by now; the granted permission stays regardless.
        if (orientationOn || gaveUp || !intersecting || document.hidden) return;
      }
      addEventListener("deviceorientation", onOrientation, { passive: true });
      setTiltState(true);
    };
    track.dataset.deckTilt = "off";

    // Wired exactly once against the persistent canvas: every dispatch reads the live `handle`, so
    // a re-mount after the off-screen dispose never doubles up a stale mount's listeners.
    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      handle?.pointer(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointerleave", () => handle?.pointer(null, null));

    // Touch (spec §7). The canvas's touch-action is pan-y, so the browser owns vertical pans and
    // cancels the pointer; what reaches pointerup is a horizontal gesture or a tap.
    let touchStart: { id: number; x: number; y: number } | null = null;
    // Set by pointerup for a tap on the presented card; the click that follows consumes it below.
    let tapOnPresented = false;
    canvas.addEventListener("pointerdown", (event) => {
      // A long press, or a touch that stops a fling, ends with no click: its flag must not arm
      // the next tap (on the peeking card, say) into an unrequested permission prompt.
      tapOnPresented = false;
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("pointercancel", () => {
      touchStart = null;
      tapOnPresented = false;
    });
    canvas.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "touch" || !touchStart || touchStart.id !== event.pointerId) return;
      const dx = event.clientX - touchStart.x;
      const dy = event.clientY - touchStart.y;
      touchStart = null;
      const dir = judgeSwipe(dx, dy);
      if (dir !== 0) {
        if (presented < 0) return; // No landed rank yet to move from.
        const next = Math.max(0, Math.min(count - 1, presented + dir));
        if (next !== presented) jump(next);
        return;
      }
      // A tap on the presented card flags it for the click below; elsewhere the click handler's
      // own hit test jumps to the tapped card, as before.
      if (
        Math.abs(dx) < DECK_PARAMS.gestures.tapSlopPx &&
        Math.abs(dy) < DECK_PARAMS.gestures.tapSlopPx &&
        handle?.hit(event.clientX, event.clientY) === presented
      ) {
        tapOnPresented = true;
      }
    });
    canvas.addEventListener("click", (event) => {
      // The permission request rides this event, not the touch pointerup above: iOS ties
      // requestPermission() to a gesture it recognizes, and pointerup isn't reliably one.
      if (tapOnPresented) {
        tapOnPresented = false;
        void enableOrientation();
      }
      const index = handle?.hit(event.clientX, event.clientY) ?? null;
      if (index !== null && index !== presented) jump(index);
    });

    const armDispose = (): void => {
      clearTimeout(disposeTimer);
      disposeTimer = setTimeout(() => {
        stopOrientation();
        handle?.dispose();
        handle = null;
        delete track.dataset.deckReady;
      }, DECK_PARAMS.tiers.disposeAfterMs);
    };

    // Once the deck can't run (a stage failure or a lost context it never recovers from), stop for
    // good: no more observed intersections, no more scroll-armed mounts, nothing left mounted.
    const giveUp = (): void => {
      if (gaveUp) return;
      gaveUp = true;
      observer.disconnect();
      removeEventListener("scroll", onFirstScroll);
      stopOrientation();
      handle?.dispose();
      handle = null;
      fallback(root, track);
    };

    const mount = async () => {
      if (handle || mounting || gaveUp) return;
      mounting = true;
      try {
        const mod = await loadStage();
        await loadDeckFont();
        const mounted = await mod.mountStage({
          canvas,
          stage,
          column,
          cards,
          labels,
          portraits,
          markUrl: track.dataset.mark ?? null,
          tier,
          params: DECK_PARAMS,
          freeze,
          onState,
          onContextLost: giveUp,
        });
        handle = mounted;
        mounted.setProgress(targetP);
        mounted.setVisible(intersecting && !document.hidden);
        // The section may have scrolled off while this awaited: the observer's not-intersecting
        // branch saw no `handle` yet to arm a dispose timer on, so arm it now instead.
        if (!intersecting) armDispose();
        if (!freeze && !introPlayed && targetP < 0.5 / count) {
          introPlayed = true;
          mounted.startIntro();
        }
        void mounted.ready.then(() => {
          if (handle === mounted) track.dataset.deckReady = "";
        });
      } catch {
        giveUp();
      } finally {
        mounting = false;
      }
    };

    // The first scroll both arms the mount gate below (the stage never loads at page load, on any
    // window size) and, once idle, prefetches the stage chunk and rank E's portrait. If the journey
    // is already on screen when this fires, it triggers the mount check itself.
    const onFirstScroll = once(() => {
      hasScrolled = true;
      if (intersecting) void mount();
      idle(() => {
        void loadStage();
        const url = pickRendition(
          devicePixelRatio || 1,
          portraits[0]?.x1 ?? null,
          portraits[0]?.x2 ?? null,
        );
        if (url) new Image().src = url;
      });
    });
    addEventListener("scroll", onFirstScroll, { passive: true });

    // Ignores the window's bottom 15%: a strip of journey peeking up at load mounts nothing.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry) return;
        intersecting = entry.isIntersecting;
        if (intersecting) {
          clearTimeout(disposeTimer);
          if (hasScrolled) void mount();
        } else if (handle) {
          armDispose();
        }
        handle?.setVisible(intersecting && !document.hidden);
        if (!intersecting) stopOrientation();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(track);

    document.addEventListener("visibilitychange", () => {
      handle?.setVisible(intersecting && !document.hidden);
      if (document.hidden) stopOrientation();
    });

    // Listens for the page's whole life (a back/forward-cache restore must not freeze the deck).
    scroll(
      (progress: number) => {
        targetP = progress;
        rail.setProgress(progress);
        handle?.setProgress(progress);
      },
      { target: track, offset: ["start start", "end end"] },
    );

    if (import.meta.env.DEV && location.search.includes("tune")) {
      void import("./deck-tune").then((m) => m.mountTunePanel(track));
    }
  } catch {
    fallback(root, track);
  }
}
