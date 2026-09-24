// Site-wide identity. Career facts live in career.ts (Phase 3).
import { capitalise } from "./career";

export const site = {
  name: "Marcus Hancock-Gaillard",
  shortName: "Marcus",
  url: "https://evilist.io",
  role: "Sr. Systems Architect",
  location: "Mesa, Arizona",
  description:
    "Marcus Hancock-Gaillard runs the infrastructure behind hundreds of banking websites at 99.99% uptime, and builds the tooling in Go and Python.",
  pitch:
    "I run the infrastructure behind hundreds of banking websites at 99.99%: security, compliance, failover, and the automation, end to end. And I build the tooling in Go and Python.",
  /** The hero's rotating title (spec §4.5). The first is the current role. */
  titles: [
    "Sr. Systems Architect",
    "Forward Deployed Engineer",
    "Systems Engineer",
    "Linux Engineer",
    "Site Reliability Engineer",
    "Platform Engineer",
    "DevOps Engineer",
    "Infrastructure Engineer",
    "Automation Specialist",
    "Security Engineer",
    "Cloud Engineer",
    "Backend Developer",
  ],
  socials: {
    github: "https://github.com/m8mz",
    linkedin: "https://www.linkedin.com/in/m8mz/",
  },
} as const;

/** The hero's pitch. `phrase` comes from decadePhrase(); site.pitch stays for the resume. */
export function heroPitch(phrase: string): string {
  return `${capitalise(phrase)} in Linux infrastructure. Today I run the platform behind hundreds of banking websites at 99.99%: security, compliance, failover and the automation, end to end. And I build the tooling in Go and Python.`;
}

export const nav = [
  { href: "/resume", label: "Resume" },
  { href: "/now", label: "Now" },
  { href: "/notes", label: "Notes" },
  { href: "/contact", label: "Contact" },
] as const;
