// Every tunable number of the journey deck, at the spec's starting values (deck spec §5–§8).
// Plan 2's dev-only tuning panel edits DECK_PARAMS live; the final values get committed here.
// Units: CSS px for lengths (the stage maps 100 px to one world unit), degrees for angles,
// milliseconds for time, fractions of the card's width where a comment says so.

export interface LayoutParams {
  cardHMin: number;
  cardHMax: number;
  /** Card height as a fraction of the stage height, before the clamp. */
  cardHRatio: number;
  railH: number;
  pad: number;
  /** Rack slot spacing, a fraction of the card's width. */
  slotGap: number;
  /** How wide a racked back projects at rackRotY, a fraction of the card's width. */
  backProjection: number;
  /** Gap between the rack and the presented card, a fraction of the card's width. */
  gap: number;
  /** How far above the rack the presented card's bottom edge sits. */
  presentedLift: number;
  /** Phone: the next card's near edge sits this far inside the stage's right edge. */
  phoneNextInset: number;
  phoneNextRotY: number;
  /** Phone: played cards exit to this centre x, a fraction of the card's width (negative). */
  phoneExitX: number;
  phoneExitRotY: number;
  columnFraction: number;
  columnMax: number;
  /** Resize and orientation changes wait this long before the deck relayouts (spec §6). */
  relayoutDebounceMs: number;
}

export interface PullParams {
  /** A card counts as landed above this pull. */
  landedAt: number;
  /** Tilt, float and the landed energy blend in over pull ∈ [settleStart, 1]. */
  settleStart: number;
  /** Rotation waits until this much of the pull is done, so the card slides and lifts before it
   * turns. */
  rotDelay: number;
  /** The back-ease's overshoot constant (c1). */
  overshoot: number;
  /** The presented card's z, and the peak of the extra lift during the pull. */
  liftZ: number;
  liftPeak: number;
  scalePeak: number;
  rackRotY: number;
}

export interface DriveParams {
  /** One rank change plays this long, whatever the wheel does. */
  durationMs: number;
  /** A boundary must be passed by this fraction of a stretch before the rank changes. */
  hysteresis: number;
}

export interface DeckParams {
  drive: DriveParams;
  layout: LayoutParams;
  pull: PullParams;
  tilt: { maxX: number; maxY: number; tau: number };
  /** Touch gestures (spec §7). */
  gestures: {
    /** A swipe needs at least this much horizontal travel, in CSS px. */
    swipeMinPx: number;
    /** …and at least this many times more horizontal than vertical travel. */
    swipeRatio: number;
    /** Degrees of card tilt per degree of device tilt, before the tilt clamps apply. */
    orientationGain: number;
    /** A touch that traveled less than this in either axis, in CSS px, counts as a tap. */
    tapSlopPx: number;
  };
  float: {
    fadeInMs: number;
    y: { amp: number; periodMs: number };
    rotZ: { amp: number; periodMs: number };
    rotY: { amp: number; periodMs: number };
    rotX: { amp: number; periodMs: number };
  };
  hover: { z: number; y: number; inMs: number; outMs: number };
  intro: {
    dealMs: number;
    staggerMs: number;
    holdMs: number;
    pullMs: number;
    fastForward: number;
    /** How far off-stage the cards start, a fraction of the card's width. */
    entryOffset: number;
  };
  print: { stepMs: number; eyesMs: number; landingMs: number; cursorMs: number };
  camera: { fov: number; parallax: number; parallaxTau: number };
  energy: { s: number; sPlusBase: number; sPlusRamp: number; sPlusWindow: number; pulling: number };
  light: {
    ambient: number;
    key: number;
    rim: number;
    flareMs: number;
  };
  material: {
    roughness: number;
    metalness: number;
    clearcoat: number;
    clearcoatRoughness: number;
    envMapIntensity: number;
    sheen: number;
    sheenRoughness: number;
    edgeRoughness: number;
    edgeMetalness: number;
    thickness: number;
    cornerRadius: number;
    layerZ: { glow: number; frame: number; text: number; chip: number };
  };
  smoke: {
    pool: number;
    poolMid: number;
    rateS: number;
    rateSPlusBase: number;
    rateSPlusRamp: number;
    burstSPlus: number;
    burstS: number;
    opacityMin: number;
    opacityMax: number;
    sideSpeed: number;
    /** Frames the frozen deck's cloud has aged before its one render. */
    prewarmFrames: number;
  };
  fog: {
    strengthS: number;
    strengthSPlus: number;
    radiusS: number;
    radiusSPlusBase: number;
    radiusSPlusRamp: number;
    kick: number;
    kickMs: number;
  };
  /** The aura's opacity recipe (deck spec §8 as amended by Plans 5 and 6): S's opacity at S's own
   * energy, S+'s base and ramp, the window fraction where the glow and aura darken to black, from
   * `fadeFrom` to `fadeTo` (so neither ever sits on the name plate), and `tauMs`, the exponential
   * time constant the applied opacity eases toward that recipe with (deck-energy's `easeToward`),
   * so a handoff's target never steps onto the card in one frame. */
  aura: {
    tauMs: number;
    s: number;
    sPlusBase: number;
    sPlusRamp: number;
    fadeFrom: number;
    fadeTo: number;
  };
  glow: { gain: number; flareScale: number };
  seam: { sMin: number; sMax: number; sPlusMin: number; sPlusMax: number; periodMs: number };
  bloom: { strength: number; radius: number; threshold: number };
  tiers: { dprHigh: number; dprMid: number; disposeAfterMs: number };
}

export function defaultDeckParams(): DeckParams {
  return {
    drive: { durationMs: 900, hysteresis: 0.15 },
    layout: {
      cardHMin: 320,
      cardHMax: 560,
      cardHRatio: 0.62,
      railH: 88,
      pad: 24,
      slotGap: 0.14,
      backProjection: 0.22,
      gap: 0.3,
      presentedLift: 30,
      phoneNextInset: 24,
      phoneNextRotY: -80,
      phoneExitX: -0.6,
      phoneExitRotY: 70,
      columnFraction: 0.78,
      columnMax: 1200,
      relayoutDebounceMs: 150,
    },
    pull: {
      landedAt: 0.985,
      settleStart: 0.9,
      rotDelay: 0.15,
      overshoot: 1.3,
      liftZ: 60,
      liftPeak: 1.6,
      scalePeak: 0.06,
      rackRotY: 103,
    },
    tilt: { maxX: 8, maxY: 10, tau: 120 },
    gestures: { swipeMinPx: 40, swipeRatio: 2, orientationGain: 0.5, tapSlopPx: 8 },
    float: {
      fadeInMs: 1500,
      y: { amp: 4, periodMs: 4200 },
      rotZ: { amp: 0.6, periodMs: 6100 },
      rotY: { amp: 1.2, periodMs: 5300 },
      rotX: { amp: 0.8, periodMs: 4700 },
    },
    hover: { z: 6, y: 3, inMs: 150, outMs: 250 },
    intro: {
      dealMs: 420,
      staggerMs: 55,
      holdMs: 200,
      pullMs: 700,
      fastForward: 4,
      entryOffset: 2.2,
    },
    print: { stepMs: 90, eyesMs: 500, landingMs: 700, cursorMs: 1000 },
    camera: { fov: 26, parallax: 0.15, parallaxTau: 200 },
    energy: { s: 0.3, sPlusBase: 0.25, sPlusRamp: 0.75, sPlusWindow: 0.7, pulling: 0.15 },
    light: {
      ambient: 0.35,
      key: 2.2,
      rim: 0.8,
      flareMs: 400,
    },
    material: {
      roughness: 0.35,
      metalness: 0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.5,
      sheen: 1,
      sheenRoughness: 0.5,
      edgeRoughness: 0.6,
      edgeMetalness: 0.2,
      thickness: 6,
      cornerRadius: 2,
      layerZ: { glow: 0.2, frame: 1.4, text: 2.6, chip: 4 },
    },
    smoke: {
      pool: 140,
      poolMid: 70,
      rateS: 0.35,
      rateSPlusBase: 1.2,
      rateSPlusRamp: 4,
      burstSPlus: 30,
      burstS: 12,
      opacityMin: 0.1,
      opacityMax: 0.22,
      sideSpeed: 1.5,
      prewarmFrames: 240,
    },
    fog: {
      strengthS: 0.1,
      strengthSPlus: 0.35,
      radiusS: 1.0,
      radiusSPlusBase: 1.2,
      radiusSPlusRamp: 2.4,
      kick: 0.5,
      kickMs: 600,
    },
    aura: { tauMs: 120, s: 0.45, sPlusBase: 0.55, sPlusRamp: 0.45, fadeFrom: 0.72, fadeTo: 0.9 },
    glow: { gain: 1.2, flareScale: 1.4 },
    seam: { sMin: 0.1, sMax: 0.25, sPlusMin: 0.2, sPlusMax: 0.5, periodMs: 3200 },
    // Threshold 0.5 keeps the soft violet aura and seams out of the blur (their luminance stays
    // under 0.2); only the pale eyes and S+ flames bloom. UnrealBloomPass returns a large smooth
    // source at about three times its strength, so 0.45 reads as a halo, not a wash.
    bloom: { strength: 0.45, radius: 0.5, threshold: 0.5 },
    tiers: { dprHigh: 2, dprMid: 1.5, disposeAfterMs: 30_000 },
  };
}

/** The live parameters. Modules read this by default; the tuning panel mutates it in place. */
export const DECK_PARAMS: DeckParams = defaultDeckParams();
