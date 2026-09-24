// The hero's stack network (spec §4.4): tools Marcus runs, as labelled nodes, plus unlabelled
// fillers for density. src/scripts/network.ts lays it out from the seed, so every visit and every
// visual baseline draws the same picture.
import type { NetworkConfig } from "../scripts/network";

export const NETWORK: NetworkConfig = {
  width: 640,
  height: 800,
  seed: 20260924,
  margin: 32,
  filler: 30,
  labels: [
    "Linux",
    "HAProxy",
    "Podman",
    "Ansible",
    "Go",
    "Python",
    "Proxmox",
    "Ceph",
    "BGP",
    "WireGuard",
    "Wazuh",
    "PostgreSQL",
    "MariaDB",
    "Grafana",
    "Prometheus",
    "Kubernetes",
    "Docker",
    "Jenkins",
    "Nginx",
    "Bash",
    "Django",
    "Keepalived",
    "FreeIPA",
    "GitHub Actions",
  ],
};
