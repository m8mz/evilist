// Systems Marcus built at work, described without confidential details.
export interface WorkItem {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  stack: string[];
}

export const work: readonly WorkItem[] = [
  {
    id: "infra-platform",
    title: "Infrastructure management platform",
    summary:
      "A full-stack application that drives HAProxy configuration, SSL installation, and system monitoring through an API instead of hand-edited config files.",
    outcome: "It's now the team's primary tool for day-to-day infrastructure operations.",
    stack: ["Python", "Django", "React", "Tailwind CSS", "PostgreSQL"],
  },
  {
    id: "source-of-truth",
    title: "One source of truth, served by a Go API",
    summary:
      "A MariaDB schema that is the authoritative record of the infrastructure, fronted by a custom Go API.",
    outcome: "Internal tools and production services read from the same data.",
    stack: ["Go", "MariaDB"],
  },
  {
    id: "provisioning",
    title: "Hands-off provisioning",
    summary:
      "Ansible playbooks and Jenkins pipelines that take new infrastructure from bare metal to serving traffic.",
    outcome: "Setup went from manual to fully automated, and deployments got substantially faster.",
    stack: ["Ansible", "Jenkins", "Bash", "Python"],
  },
];

export const sharedRepos = [
  {
    name: "dotfiles",
    href: "https://github.com/m8mz/dotfiles",
    description:
      "Neovim, Ghostty, WezTerm, and Alacritty configs, plus yabai and skhd for window management.",
  },
  {
    name: "evilist",
    href: "https://github.com/m8mz/evilist",
    description: "The source for this site: Astro, CI, and the HAProxy edge it runs behind.",
  },
] as const;
