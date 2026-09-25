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
      "Ran live build sessions and managed my own appointment schedule",
      "Turned non-technical customers into confident site owners",
      "Managed 40–60 clients on my own schedule",
      "Helped start the WP Live department in the Tempe office, focused on WordPress",
    ],
    printHighlights: 2,
    skills: ["WordPress", "Joomla", "Drupal"],
    activity: "wordpress",
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
