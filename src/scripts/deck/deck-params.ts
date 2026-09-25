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
  /** How far above the floor the presented card's bottom edge sits. */
  presentedLift: number;
  /** The floor line's distance below the racked cards' bottom edge. */
  floorOffset: number;
  /** Phone: the next card's near edge sits this far inside the stage's right edge. */
  phoneNextInset: number;
  phoneNextRotY: number;
  /** Phone: played cards exit to this centre x, a fraction of the card's width (negative). */
  phoneExitX: number;
  phoneExitRotY: number;
  columnFraction: number;
  columnMax: number;
}

export interface PullParams {
  /** The handoff to the next card starts at this fraction of a rank's scroll stretch. */
  handoffStart: number;
  /** A card counts as landed above this pull. */
  landedAt: number;
  /** The back-ease's overshoot constant (c1). */
  overshoot: number;
  /** The presented card's z, and the peak of the extra lift during the pull. */
  liftZ: number;
  liftPeak: number;
  scalePeak: number;
  rackRotY: number;
}

export interface DeckParams {
  scroll: { tau: number };
  layout: LayoutParams;
  pull: PullParams;
  tilt: { maxX: number; maxY: number; tau: number };
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
    floorMs: number;
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
    pointS: number;
    pointSPlus: number;
    breath: number;
    breathMs: number;
    flareSPlus: number;
    flareS: number;
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
  glow: { scaleS: number; scaleSPlusBase: number; scaleSPlusRamp: number; flareScale: number };
  seam: { sMin: number; sMax: number; sPlusMin: number; sPlusMax: number; periodMs: number };
  shadow: { widthFactor: number; heightFactor: number; opacity: number; liftFade: number };
  bloom: { strength: number; radius: number; threshold: number };
  tiers: { dprHigh: number; dprMid: number; disposeAfterMs: number };
}

export function defaultDeckParams(): DeckParams {
  return {
    scroll: { tau: 90 },
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
      floorOffset: 8,
      phoneNextInset: 24,
      phoneNextRotY: -80,
      phoneExitX: -0.6,
      phoneExitRotY: 70,
      columnFraction: 0.78,
      columnMax: 1200,
    },
    pull: {
      handoffStart: 0.7,
      landedAt: 0.985,
      overshoot: 1.3,
      liftZ: 60,
      liftPeak: 1.6,
      scalePeak: 0.06,
      rackRotY: 103,
    },
    tilt: { maxX: 8, maxY: 10, tau: 120 },
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
      floorMs: 500,
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
      pointS: 16,
      pointSPlus: 55,
      breath: 0.15,
      breathMs: 3000,
      flareSPlus: 3,
      flareS: 1.6,
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
    glow: { scaleS: 4.2, scaleSPlusBase: 7, scaleSPlusRamp: 9, flareScale: 1.4 },
    seam: { sMin: 0.1, sMax: 0.25, sPlusMin: 0.2, sPlusMax: 0.5, periodMs: 3200 },
    shadow: { widthFactor: 1.15, heightFactor: 0.35, opacity: 0.55, liftFade: 0.5 },
    bloom: { strength: 0.9, radius: 0.6, threshold: 0 },
    tiers: { dprHigh: 2, dprMid: 1.5, disposeAfterMs: 30_000 },
  };
}

/** The live parameters. Modules read this by default; the tuning panel mutates it in place. */
export const DECK_PARAMS: DeckParams = defaultDeckParams();
