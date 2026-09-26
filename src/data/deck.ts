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
    outfit:
      "an oversized grey hoodie hanging loose off narrow shoulders, the hood bunched at the neck, a headset around the neck, a company lanyard",
    eyes: "wide, warm brown, no glow",
    eyeColor: "#6b4a2f",
    expression: "open, eager, a little anxious, the hair falling over his eyes",
    posture: "slight frame, shoulders rounded and slightly forward, lost in the baggy hoodie",
    subject:
      "the journey character at rank E, slight and a little anxious in an oversized grey hoodie with a headset around his neck and a lanyard, wide warm brown eyes under messy hair",
    glowBand: band("t1-support"),
  },
  {
    id: "web-concierge",
    rank: "D",
    outfit: "a black company polo still a size too big, sleeves pushed up, no headset",
    eyes: "slightly narrower, a cold grey glint",
    eyeColor: "#7a8088",
    expression: "focused, the start of a smile, the hair pushed off his brow",
    posture: "upright, the shoulders starting to square",
    subject:
      "the journey character at rank D, in a dark polo with the sleeves pushed up, narrowed eyes with a cold grey glint, the start of a smile, standing straighter",
    glowBand: band("web-concierge"),
  },
  {
    id: "professional-services",
    rank: "C",
    outfit: "a fitted black shirt, a laptop-bag strap across a broader chest",
    eyes: "steel grey, alert",
    eyeColor: "#96a0aa",
    expression: "determined, the jaw sharper",
    posture: "head a touch down, eyes up, the frame filling out",
    subject:
      "the journey character at rank C, in a fitted black shirt with a laptop-bag strap across his chest, alert steel-grey eyes looking up from a lowered head, the frame filling out",
    glowBand: band("professional-services"),
  },
  {
    id: "t3-support",
    rank: "B",
    outfit:
      "a fitted black shirt with the sleeves rolled over solid forearms, a coiled ethernet cable over one shoulder, its RJ45 plug hanging in view",
    eyes: "steel grey with a faint violet rim on the iris",
    eyeColor: "#8a7fb8",
    expression: "tired but sharp, a hard-won calm",
    posture: "jaw set, shoulders squared",
    subject:
      "the journey character at rank B, sleeves rolled over solid forearms, a coiled ethernet cable over one shoulder, tired sharp eyes with a faint violet rim, jaw set",
    glowBand: band("t3-support"),
  },
  {
    id: "sysadmin",
    rank: "A",
    outfit: "a fitted black technical shirt over a broad frame, rack keys on a carabiner",
    eyes: "violet iris, no glow",
    eyeColor: "#7040d2",
    expression:
      "quiet confidence, a knowing half-smile, the hair swept back with one strand over the brow",
    posture: "standing tall, squared shoulders, chin level",
    subject:
      "the journey character at rank A, broad-shouldered in a fitted black technical shirt with rack keys on a carabiner, violet eyes, a knowing half-smile",
    glowBand: band("sysadmin"),
  },
  {
    id: "linux-engineer",
    rank: "S",
    outfit:
      "a tailored black suit cut close to his figure: a long black coat with sharp lapels over a white shirt buttoned to the collar, no tie, one ember-orange stitched seam along the lapel edge",
    eyes: "violet iris, glowing",
    eyeColor: "#9d7cf0",
    expression: "calm authority, the hint of a smirk, the hair swept back and sharp",
    posture: "chin level, slight three-quarter turn, broad shoulders filling the coat",
    subject:
      "the journey character at rank S, in a tailored black suit with a long coat over a white shirt, glowing violet eyes, calm authority with the hint of a smirk",
    glowBand: band("linux-engineer"),
  },
  {
    id: "systems-architect",
    rank: "S+",
    outfit:
      "the long black coat open over a black shirt that matches it, violet energy visible inside it and at the shoulders, violet light catching the coat's edges",
    eyes: "white-violet, the glow breaking past the lids",
    eyeColor: "#e6ddff",
    expression: "serene, unbothered, every line of the face sharp",
    posture: "chin slightly up, energy rising, the frame at its strongest",
    subject:
      "the journey character at rank S+, his long black coat open with violet energy rising inside it and at his shoulders, white-violet eyes glowing past the lids, chin slightly up",
    glowBand: band("systems-architect"),
  },
];

export const deckArtById: Readonly<Record<string, DeckArt>> = Object.fromEntries(
  deckArt.map((art) => [art.id, art]),
);
