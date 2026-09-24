// Tools and practices, grouped by the job they do. Shown on the home page and resume.
export interface SkillDomain {
  name: string;
  items: string[];
}

export const skillDomains: readonly SkillDomain[] = [
  {
    name: "Load balancing and high availability",
    items: [
      "HAProxy Enterprise and OSS",
      "WAF",
      "Rate limiting and bot mitigation",
      "Keepalived (VRRP)",
      "BGP failover",
    ],
  },
  {
    name: "Virtualization and storage",
    items: ["Proxmox VE", "Proxmox Backup Server", "Ceph", "Synology", "HPE iLO"],
  },
  {
    name: "Network and security",
    items: ["FortiGate", "pfSense", "Arista", "WireGuard", "Wazuh", "FreeIPA and LDAP"],
  },
  {
    name: "Automation and code",
    items: ["Ansible", "Jenkins", "GitHub Actions", "Go", "Python", "Bash", "Django"],
  },
  {
    name: "Containers and data",
    items: ["Docker", "Kubernetes", "MariaDB Galera", "PostgreSQL", "PgBouncer"],
  },
  {
    name: "Observability",
    items: ["Grafana", "Prometheus", "SensuGo", "ELK", "LibreNMS"],
  },
  {
    name: "Linux and web",
    items: ["Rocky Linux", "Debian", "Apache", "Nginx", "PHP", "WordPress fleets"],
  },
  {
    name: "Compliance",
    items: ["PCI-DSS", "HIPAA"],
  },
];
