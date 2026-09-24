// Single source of truth for the career timeline: home journey, resume page, JSON-LD, resume PDF.
// Public-safe facts only: no customer names, hostnames, IPs, or vendor/partner names.

export type RankLabel = "E" | "E+" | "D" | "C" | "B" | "A" | "S";
export type Activity =
  "headset" | "wordpress" | "migration" | "escalation" | "rack" | "pipeline" | "datacenter";

export interface CareerStage {
  id: string;
  rank: number;
  rankLabel: RankLabel;
  title: string;
  /** Shorter title for tight layouts (the journey card). Defaults to title. */
  shortTitle?: string;
  org: string;
  location: string;
  /** yyyy-mm */
  start: string;
  /** yyyy-mm, or null while ongoing */
  end: string | null;
  summary: string;
  highlights: string[];
  skills: string[];
  /** What the avatar is doing in the journey scene for this stage. */
  activity: Activity;
}

const ENDURANCE = "Endurance International Group";
const PHOENIX = "Phoenix, Arizona";

export const career: readonly CareerStage[] = [
  {
    id: "t1-support",
    rank: 1,
    rankLabel: "E",
    title: "T1 Tech Support",
    org: ENDURANCE,
    location: PHOENIX,
    start: "2016-06",
    end: "2016-09",
    summary: "Front-line support for customers on shared, VPS, and dedicated hosting.",
    highlights: [
      "Troubleshot websites, email, databases, and DNS on live customer servers",
      "Traced mail delivery problems through Splunk logs",
    ],
    skills: ["DNS", "Email", "Splunk", "cPanel"],
    activity: "headset",
  },
  {
    id: "web-concierge",
    rank: 2,
    rankLabel: "E+",
    title: "Web Concierge (WP Live)",
    org: ENDURANCE,
    location: PHOENIX,
    start: "2016-09",
    end: "2017-02",
    summary:
      "Taught customers to build their own sites on WordPress, Joomla, Drupal, and Weebly as a paid one-on-one service.",
    highlights: [
      "Ran live build sessions and managed my own appointment schedule",
      "Turned non-technical customers into confident site owners",
    ],
    skills: ["WordPress", "Joomla", "Drupal"],
    activity: "wordpress",
  },
  {
    id: "professional-services",
    rank: 3,
    rankLabel: "D",
    title: "Professional Services Engineer",
    org: ENDURANCE,
    location: PHOENIX,
    start: "2017-02",
    end: "2017-09",
    summary: "Delivered paid engineering work across every hosting brand in the company.",
    highlights: [
      "Migrated websites and mailboxes between servers and providers",
      "Built custom PHP forms, code insertions, and third-party installs",
    ],
    skills: ["PHP", "MySQL", "Site migrations"],
    activity: "migration",
  },
  {
    id: "t3-support",
    rank: 4,
    rankLabel: "C",
    title: "T3 Tech Support",
    org: ENDURANCE,
    location: PHOENIX,
    start: "2017-09",
    end: "2018-02",
    summary: "The escalation point for shared, VPS, and dedicated hosting support.",
    highlights: [
      "Resolved issues escalated by upper management and the legal team",
      "Closed the cases other support tiers couldn't",
    ],
    skills: ["Linux", "Apache", "Troubleshooting"],
    activity: "escalation",
  },
  {
    id: "sysadmin",
    rank: 5,
    rankLabel: "B",
    title: "Systems Administrator",
    org: ENDURANCE,
    location: PHOENIX,
    start: "2018-02",
    end: "2019-08",
    summary:
      "Administered VPS, dedicated, and shared servers on cPanel and CentOS 6/7, plus self-managed hosts on KVM-OpenStack and OpenVZ.",
    highlights: [
      "Kept a large fleet of customer servers patched, secured, and running",
      "Wrote Bash tooling to speed up routine server administration",
    ],
    skills: ["CentOS", "cPanel", "KVM", "OpenStack", "OpenVZ", "Bash"],
    activity: "rack",
  },
  {
    id: "linux-engineer",
    rank: 6,
    rankLabel: "A",
    title: "Linux Engineer",
    org: "Caris Life Sciences",
    location: PHOENIX,
    start: "2019-10",
    end: "2021-05",
    summary:
      "Linux engineering and DevOps for a life-sciences company, alongside independent Linux administration contracts.",
    highlights: [
      "Streamlined deployment, automation, and integration with Ansible and Jenkins",
      "Replaced manual server setup with repeatable automation",
      "Independent Linux administrator contracts, Sep 2019 to Aug 2021",
    ],
    skills: ["Ansible", "Jenkins", "Linux", "DevOps"],
    activity: "pipeline",
  },
  {
    id: "systems-architect",
    rank: 7,
    rankLabel: "S",
    title: "Sr. Systems Architect and Director of IT Operations",
    shortTitle: "Sr. Systems Architect",
    org: "BankSITE® Services",
    location: "Scottsdale, Arizona",
    start: "2021-11",
    end: null,
    summary:
      "Technical lead for the infrastructure behind hundreds of banking websites, across a primary datacenter and a disaster-recovery hot site.",
    highlights: [
      "Hold a 99.99% uptime target with BGP failover between two datacenters",
      "Run HAProxy Enterprise load balancing and WAF, with rate limiting and bot mitigation",
      "Built the infrastructure management platform (Django, React, PostgreSQL) the team runs daily",
      "Designed a Go API over a MariaDB source-of-truth schema used by internal and production services",
      "Own PCI-DSS compliance scanning and remediation; report to the CEO and mentor the IT team",
    ],
    skills: ["HAProxy", "Proxmox", "Ceph", "BGP", "Wazuh", "Go", "Python", "PCI-DSS"],
    activity: "datacenter",
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "Present"}`;
}

export function yearsOfExperience(now: Date = new Date()): number {
  const [year, month] = career[0].start.split("-").map(Number);
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.floor(months / 12);
}

export function currentStage(): CareerStage {
  return career.find((s) => s.end === null) ?? career[career.length - 1];
}
