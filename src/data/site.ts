// Site-wide identity. Career facts live in career.ts (Phase 3).
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
  socials: {
    github: "https://github.com/m8mz",
    linkedin: "https://www.linkedin.com/in/m8mz/",
  },
} as const;

export const nav = [
  { href: "/resume", label: "Resume" },
  { href: "/notes", label: "Notes" },
  { href: "/contact", label: "Contact" },
] as const;
