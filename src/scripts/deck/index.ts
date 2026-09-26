// The journey deck's page script (deck spec §3, §7, §9). It runs in the initial bundle and stays
// small: decide the tier, wire the rail, bind Motion's scroll(), prefetch the stage chunk after
// the first scroll, mount it when the journey is on screen, mirror the stage's state into data
// attributes, and hand the section to the timeline when anything is missing.
import { scroll } from "motion";
import { career } from "../../data/career";
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

    // Wired exactly once against the persistent canvas: every dispatch reads the live `handle`, so
    // a re-mount after the off-screen dispose never doubles up a stale mount's listeners.
    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      handle?.pointer(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointerleave", () => handle?.pointer(null, null));
    canvas.addEventListener("click", (event) => {
      const index = handle?.hit(event.clientX, event.clientY) ?? null;
      if (index !== null && index !== presented) jump(index);
    });

    const armDispose = (): void => {
      clearTimeout(disposeTimer);
      disposeTimer = setTimeout(() => {
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
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(track);

    document.addEventListener("visibilitychange", () => {
      handle?.setVisible(intersecting && !document.hidden);
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
