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
      "an anime systems engineer in a black hoodie and headset on a night shift at a support desk, lit by orange monitors",
  },
  "web-concierge": {
    still: webConcierge,
    subject:
      "the same engineer at a standing desk, arranging a floating website wireframe above his laptop",
  },
  "professional-services": {
    still: professionalServices,
    subject: "the same engineer between two rows of servers, holding a glowing orange cube of data",
  },
  "t3-support": {
    still: t3Support,
    subject:
      "the same engineer standing calm before a wall of orange alert lights, shadows rising at his feet",
  },
  sysadmin: {
    still: sysadmin,
    subject:
      "the same engineer in a short black coat beside an open server rack, violet smoke curling at his feet",
  },
  "linux-engineer": {
    still: linuxEngineer,
    subject:
      "the same engineer in a long black coat conducting a pipeline of floating modules while violet shadow hands assemble them",
  },
  "systems-architect": {
    still: systemsArchitect,
    subject:
      "the same engineer in a long open coat in a datacenter aisle, rows of server racks and violet shadow energy around him",
  },
};
