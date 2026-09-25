// The journey deck's art per career stage (deck spec §10): what each portrait shows, for the
// Higgsfield prompts, the timeline's alt text, the placeholder painter and the glow-mask import.
// Keyed by CareerStage.id, in rank order. The bands are the allowed violet coverage of a portrait
// in percent; scripts/import-portrait.mjs reads the same JSON.
import type { RankLabel } from "./career";
import bands from "./deck-glow-bands.json";

export interface DeckArt {
  id: string;
  rank: RankLabel;
  outfit: string;
  eyes: string;
  /** The violet ramp: the placeholder's eyes and the glow mask's tint. */
  eyeColor: string;
  expression: string;
  posture: string;
  /** What the portrait shows; the alt text becomes "Illustration: <subject>". */
  subject: string;
  /** Allowed violet coverage of the portrait, in percent (min, max). */
  glowBand: readonly [number, number];
}

const band = (id: string): readonly [number, number] => {
  const value = (bands as unknown as Record<string, readonly [number, number]>)[id];
  if (!value) throw new Error(`deck-glow-bands.json has no band for ${id}`);
  return value;
};

export const deckArt: readonly DeckArt[] = [
  {
    id: "t1-support",
    rank: "E",
    outfit: "grey hoodie, headset around the neck, company lanyard",
    eyes: "wide, warm brown, no glow",
    eyeColor: "#6b4a2f",
    expression: "open, eager, a little anxious",
    posture: "shoulders slightly forward",
    subject:
      "the journey character at rank E, in a grey hoodie with a headset around his neck and a lanyard, wide warm brown eyes, shoulders slightly forward",
    glowBand: band("t1-support"),
  },
  {
    id: "web-concierge",
    rank: "D",
    outfit: "dark company polo, no headset, sleeves pushed up",
    eyes: "slightly narrower, a cold grey glint",
    eyeColor: "#7a8088",
    expression: "focused, the start of a smile",
    posture: "upright",
    subject:
      "the journey character at rank D, in a dark polo with the sleeves pushed up, narrowed eyes with a cold grey glint, the start of a smile",
    glowBand: band("web-concierge"),
  },
  {
    id: "professional-services",
    rank: "C",
    outfit: "black shirt, laptop-bag strap across the chest",
    eyes: "steel grey, alert",
    eyeColor: "#96a0aa",
    expression: "determined",
    posture: "head a touch down, eyes up",
    subject:
      "the journey character at rank C, in a black shirt with a laptop-bag strap across his chest, alert steel-grey eyes looking up from a lowered head",
    glowBand: band("professional-services"),
  },
  {
    id: "t3-support",
    rank: "B",
    outfit: "rolled sleeves, a coiled patch cable over one shoulder",
    eyes: "steel grey with a faint violet rim on the iris",
    eyeColor: "#8a7fb8",
    expression: "tired but sharp",
    posture: "jaw set",
    subject:
      "the journey character at rank B, sleeves rolled, a coiled patch cable over one shoulder, tired sharp eyes with a faint violet rim, jaw set",
    glowBand: band("t3-support"),
  },
  {
    id: "sysadmin",
    rank: "A",
    outfit: "fitted black technical shirt, rack keys on a carabiner",
    eyes: "violet iris, no glow",
    eyeColor: "#7040d2",
    expression: "quiet confidence",
    posture: "squared shoulders",
    subject:
      "the journey character at rank A, in a fitted black technical shirt with rack keys on a carabiner, violet eyes, squared shoulders",
    glowBand: band("sysadmin"),
  },
  {
    id: "linux-engineer",
    rank: "S",
    outfit: "dark technical coat, closed to the collar",
    eyes: "violet iris, glowing",
    eyeColor: "#9d7cf0",
    expression: "calm authority",
    posture: "chin level, slight three-quarter turn",
    subject:
      "the journey character at rank S, in a dark technical coat closed to the collar, glowing violet eyes, calm and level",
    glowBand: band("linux-engineer"),
  },
  {
    id: "systems-architect",
    rank: "S+",
    outfit: "the coat open, violet energy visible inside it and at the shoulders",
    eyes: "white-violet, the glow breaking past the lids",
    eyeColor: "#e6ddff",
    expression: "serene, unbothered",
    posture: "chin slightly up, energy rising",
    subject:
      "the journey character at rank S+, his coat open with violet energy rising inside it and at his shoulders, white-violet eyes glowing past the lids, chin slightly up",
    glowBand: band("systems-architect"),
  },
];

export const deckArtById: Readonly<Record<string, DeckArt>> = Object.fromEntries(
  deckArt.map((art) => [art.id, art]),
);
