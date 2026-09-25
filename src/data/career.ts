// Single source of truth for the career timeline: home journey, resume page, JSON-LD, resume PDF.
// Public-safe facts only: no customer names, hostnames, IPs, or vendor/partner names.

export type RankLabel = "E" | "D" | "C" | "B" | "A" | "S" | "S+";
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
  /** How many highlights (strongest first) the PDF prints. /resume shows them all. */
  printHighlights: number;
  skills: string[];
  /** What the avatar is doing in the journey scene for this stage. */
  activity: Activity;
  /** One line the journey card prints as the quote in the portrait window. Drawn from the
   * highlights; under 80 chars. */
  log: string;
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
    printHighlights: 2,
    skills: ["DNS", "Email", "Splunk", "cPanel"],
    activity: "headset",
    log: "Traced lost mail through Splunk on live customer servers.",
  },
  {
    id: "web-concierge",
    rank: 2,
    rankLabel: "D",
    title: "Web Concierge (WP Live)",
    org: ENDURANCE,
    location: PHOENIX,
    start: "2016-09",
    end: "2017-02",
    summary:
      "Taught customers to build their own sites on WordPress, Joomla, Drupal, Weebly, and Website Builder as a paid one-on-one service.",
    highlights: [
      "Ran live one-on-one build sessions",
      "Turned non-technical customers into confident site owners",
      "Managed 40–60 clients on my own schedule",
      "Helped start the WP Live department in the Tempe office, focused on WordPress",
    ],
    printHighlights: 2,
    skills: ["WordPress", "Joomla", "Drupal"],
    activity: "wordpress",
    log: "Turned non-technical customers into confident site owners.",
  },
  {
    id: "professional-services",
    rank: 3,
    rankLabel: "C",
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
    printHighlights: 2,
    skills: ["PHP", "MySQL", "Site migrations"],
    activity: "migration",
    log: "Moved websites and mailboxes between servers, providers and brands.",
  },
  {
    id: "t3-support",
    rank: 4,
    rankLabel: "B",
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
    printHighlights: 2,
    skills: ["Linux", "Apache", "Troubleshooting"],
    activity: "escalation",
    log: "Closed the cases the other tiers couldn't.",
  },
  {
    id: "sysadmin",
    rank: 5,
    rankLabel: "A",
    title: "Systems Administrator",
    org: ENDURANCE,
    location: PHOENIX,
    start: "2018-02",
    end: "2019-08",
    summary:
      "Administered VPS, dedicated, and shared servers on cPanel and CentOS 6/7, plus self-managed hosts on KVM-OpenStack and OpenVZ.",
    highlights: [
      "Kept a large fleet of customer servers patched, secured, and running",
      "Wrote automation in Bash, Perl, PHP, JavaScript and Python",
      "Hardened servers with ModSecurity and OWASP rules, iptables, CSF and firewalld, and ClamAV with in-house definitions and scan containers",
      "Identified and mitigated DDoS attacks; cleaned up spam and malware; kept servers PCI compliant",
      "Trained Tier 3 and junior admins in Shell, Python, Perl, JavaScript and PHP, and wrote the training material",
      "Supported Tier 1–3 teams in the US, the Philippines and India",
      "Migrated bare-metal VPS containers to cPanel servers; built software from source; diagnosed dedicated hosts over IPMI",
    ],
    printHighlights: 2,
    skills: [
      "CentOS",
      "cPanel",
      "KVM",
      "OpenStack",
      "OpenVZ",
      "Bash",
      "ModSecurity",
      "CSF",
      "ClamAV",
      "IPMI",
    ],
    activity: "rack",
    log: "Kept a fleet of customer servers patched, hardened and running.",
  },
  {
    id: "linux-engineer",
    rank: 6,
    rankLabel: "S",
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
      "Administered HPC systems for research workloads",
      "Ran monitoring with Nagios, Sensu, Zabbix and Wazuh",
      "Ran disk and tape backups (Backup Exec, Veeam) and wrote the disaster-recovery plans",
      "Administered VMware and Nutanix virtualization, SAN storage, and Samba and NFS shares",
      "Hardened and patched servers; managed access through Active Directory",
      "Supported Confluence, Jira, GitLab, Bitbucket, Mirth Connect, JBoss, GlassFish, MySQL, MariaDB, PostgreSQL, the ELK stack, LAMP and Node",
    ],
    printHighlights: 3,
    skills: [
      "Ansible",
      "Jenkins",
      "Linux",
      "DevOps",
      "Bash",
      "Python",
      "Perl",
      "HPC",
      "VMware",
      "Nutanix",
      "Veeam",
      "Nagios",
      "Zabbix",
      "Active Directory",
    ],
    activity: "pipeline",
    log: "Replaced manual server setup with repeatable automation.",
  },
  {
    id: "systems-architect",
    rank: 7,
    rankLabel: "S+",
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
      "Design and run the full stack across two physical datacenters and the cloud: virtualization, networking, containers and security, from planning to hands-on operations",
      "Manage the infrastructure and its configuration as code, cutting downtime and tightening security",
      "Lead strategic technical projects and align technology with business goals",
    ],
    printHighlights: 5,
    skills: ["HAProxy", "Proxmox", "Ceph", "BGP", "Wazuh", "Go", "Python", "PCI-DSS"],
    activity: "datacenter",
    log: "99.99 % uptime, two datacenters, BGP failover.",
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

/** How the site says Marcus's experience: "9 years", then "a decade", then "over a decade". */
export function decadePhrase(years: number): string {
  if (years < 10) return `${years} years`;
  return years === 10 ? "a decade" : "over a decade";
}

/** The phrase with its first letter upper-cased, for the start of a sentence. */
export const capitalise = (phrase: string): string =>
  phrase.charAt(0).toUpperCase() + phrase.slice(1);

export function currentStage(): CareerStage {
  return career.find((s) => s.end === null) ?? career[career.length - 1];
}

/* ---------- The journey deck's stats (deck spec §4) ---------- */

/** Months since year 0 of a "yyyy-mm" string. */
const monthIndex = (yyyyMm: string): number => {
  const [year, month] = yyyyMm.split("-").map(Number);
  return year! * 12 + (month! - 1);
};

const monthIndexOf = (date: Date): number => date.getFullYear() * 12 + date.getMonth();

/** Whole months from `start` to `end`, or to `now` while the stage is ongoing. Never negative. */
export function stageMonths(stage: CareerStage, now: Date): number {
  const end = stage.end ? monthIndex(stage.end) : monthIndexOf(now);
  return Math.max(0, end - monthIndex(stage.start));
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** "3 months", "19 months", "2 years", "4 years, 10 months". Under 24 months stays in months. */
export function tenure(stage: CareerStage, now: Date): string {
  const months = stageMonths(stage, now);
  if (months < 24) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${plural(years, "year")}, ${plural(rest, "month")}` : plural(years, "year");
}

/** Cumulative months through this stage over all stages' months: the card's XP bar, 0–1. */
export function xp(stage: CareerStage, now: Date): number {
  const total = career.reduce((sum, s) => sum + stageMonths(s, now), 0);
  if (total === 0) return 0;
  const through = career
    .filter((s) => s.rank <= stage.rank)
    .reduce((sum, s) => sum + stageMonths(s, now), 0);
  return through / total;
}

/** How many of the XP bar's blocks are lit: rounded up, so every stage shows at least one. */
export function xpBlocks(value: number, total = 10): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(total, Math.max(0, Math.ceil(value * total)));
}

/** The card's set number, "EVL-06/07". */
export const setNumber = (stage: CareerStage): string =>
  `EVL-${String(stage.rank).padStart(2, "0")}/${String(career.length).padStart(2, "0")}`;

/** The skills the card lists: the first `cap`, then "+N" for the rest. */
export function acquired(stage: CareerStage, cap = 8): string[] {
  if (stage.skills.length <= cap) return [...stage.skills];
  return [...stage.skills.slice(0, cap), `+${stage.skills.length - cap}`];
}
