// The journey's art per career stage: the rank's picture for the reduced-motion timeline (a
// composite rendered from the vector scene by scripts/render-rank-stills.mjs) and what it shows.
// Keyed by CareerStage.id. The animated stage draws public/journey/scene.svg instead.
import type { ImageMetadata } from "astro";
import linuxEngineer from "../images/journey/linux-engineer.webp";
import professionalServices from "../images/journey/professional-services.webp";
import sysadmin from "../images/journey/sysadmin.webp";
import systemsArchitect from "../images/journey/systems-architect.webp";
import t1Support from "../images/journey/t1-support.webp";
import t3Support from "../images/journey/t3-support.webp";
import webConcierge from "../images/journey/web-concierge.webp";

export interface StageArt {
  still: ImageMetadata;
  /** What the still shows; its alt text is "Illustration: <subject>". */
  subject: string;
}

export const stageArt: Readonly<Record<string, StageArt>> = {
  "t1-support": {
    still: t1Support,
    subject:
      "a flat vector engineer in a black hoodie and headset standing at a support desk between two orange-lit monitors",
  },
  "web-concierge": {
    still: webConcierge,
    subject:
      "a flat vector engineer in a hoodie, sleeves pushed up, one hand raised to floating website wireframe panels",
  },
  "professional-services": {
    still: professionalServices,
    subject:
      "a flat vector engineer in a black zip jacket holding out a glowing orange data cube beside a path of small lights",
  },
  "t3-support": {
    still: t3Support,
    subject:
      "a flat vector engineer in a high-collar jacket standing calm before a wall of orange alert lights, violet shadows at his feet",
  },
  sysadmin: {
    still: sysadmin,
    subject:
      "a flat vector engineer in a short black coat beside an open server rack, violet smoke along the floor",
  },
  "linux-engineer": {
    still: linuxEngineer,
    subject:
      "a flat vector engineer in a long black coat conducting a pipeline of floating modules while violet shadow hands reach in",
  },
  "systems-architect": {
    still: systemsArchitect,
    subject:
      "a flat vector engineer in a long open coat with orange cuffs before rows of violet shadow server racks, a violet aura around him",
  },
};
