import { describe, expect, it } from "vitest";
import { NETWORK } from "../src/data/network";
import {
  edgeKey,
  isDotVisible,
  labelSide,
  layoutNetwork,
  lightingFor,
  mulberry32,
  nearestLabelled,
  neighboursOf,
  visibleBox,
  type Box,
  type Network,
} from "../src/scripts/network";

const net = layoutNetwork(NETWORK);

function reachable(network: Network, from: number): Set<number> {
  const adj = neighboursOf(network);
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    for (const n of adj.get(queue.shift()!) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

describe("NETWORK", () => {
  it("labels the 58 open-source Linux tools and distros from the spec, in order", () => {
    expect(NETWORK.labels).toEqual([
      "Linux",
      "HAProxy",
      "Keepalived",
      "Nginx",
      "Apache",
      "Podman",
      "Docker",
      "Kubernetes",
      "Ansible",
      "Jenkins",
      "Git",
      "Go",
      "Python",
      "Bash",
      "Perl",
      "Django",
      "PostgreSQL",
      "PgBouncer",
      "MariaDB",
      "Galera",
      "Ceph",
      "Proxmox",
      "KVM",
      "OpenStack",
      "OpenVZ",
      "WireGuard",
      "pfSense",
      "Wazuh",
      "FreeIPA",
      "OpenLDAP",
      "Prometheus",
      "Grafana",
      "Elasticsearch",
      "Kibana",
      "LibreNMS",
      "Nagios",
      "Zabbix",
      "Sensu",
      "ModSecurity",
      "firewalld",
      "iptables",
      "ClamAV",
      "systemd",
      "OpenSSH",
      "Samba",
      "NFS",
      "BGP",
      "Neovim",
      "tmux",
      "Debian",
      "Ubuntu",
      "Rocky Linux",
      "AlmaLinux",
      "CentOS",
      "Fedora",
      "Arch",
      "openSUSE",
      "Alpine",
    ]);
    expect(NETWORK.labels).toHaveLength(58);
    expect(NETWORK.filler).toBe(40);
  });
});

describe("mulberry32", () => {
  it("repeats for a seed and differs across seeds", () => {
    const a = mulberry32(7),
      b = mulberry32(7),
      c = mulberry32(8);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
  });
});

describe("layoutNetwork", () => {
  it("draws the same picture every time", () => {
    expect(layoutNetwork(NETWORK)).toEqual(net);
  });

  it("places every label once, in order, plus the fillers", () => {
    expect(net.nodes).toHaveLength(NETWORK.labels.length + NETWORK.filler);
    expect(net.nodes.filter((n) => n.label).map((n) => n.label)).toEqual([...NETWORK.labels]);
    net.nodes.forEach((n, i) => expect(n.id).toBe(i));
  });

  it("keeps every node inside the margins", () => {
    for (const n of net.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(NETWORK.margin);
      expect(n.x).toBeLessThanOrEqual(NETWORK.width - NETWORK.margin);
      expect(n.y).toBeGreaterThanOrEqual(NETWORK.margin);
      expect(n.y).toBeLessThanOrEqual(NETWORK.height - NETWORK.margin);
    }
  });

  it("spaces labelled nodes so their labels don't collide", () => {
    // 58 labels can't all reach the 96px target on this canvas (the placer settles for the best
    // of its tries), so this pins the achieved floor: two labelled dots are never closer than a
    // label's height plus its gap, and only one or two labels show at a time anyway. If this
    // fails after a layout change, change NETWORK.seed, not this number.
    const labelled = net.nodes.filter((n) => n.label);
    for (const a of labelled)
      for (const b of labelled)
        if (a.id < b.id)
          expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.label}/${b.label}`).toBeGreaterThanOrEqual(
            60,
          );
  });

  it("links each pair once, lower id first, with no self-links", () => {
    const keys = net.edges.map(([a, b]) => edgeKey(a, b));
    expect(new Set(keys).size).toBe(keys.length);
    for (const [a, b] of net.edges) expect(a).toBeLessThan(b);
  });

  it("is one connected graph", () => {
    expect(reachable(net, 0).size).toBe(net.nodes.length);
  });
});

// A hand-made graph: 0 — 1 — 2 — 3, and 1 — 4. Nodes 1 and 3 are labelled.
const tiny: Network = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 100, y: 0, label: "Linux" },
    { id: 2, x: 200, y: 0 },
    { id: 3, x: 300, y: 0, label: "Go" },
    { id: 4, x: 100, y: 100 },
  ],
  edges: [
    [0, 1],
    [1, 2],
    [1, 4],
    [2, 3],
  ],
};

describe("lightingFor", () => {
  it("lights the source and its neighbours, and echoes the next hop", () => {
    const l = lightingFor(tiny, 1);
    expect(new Set(l.lit)).toEqual(new Set([1, 0, 2, 4]));
    expect(l.echo).toEqual([3]);
    expect(new Set(l.litEdges)).toEqual(new Set(["0-1", "1-2", "1-4"]));
    expect(l.echoEdges).toEqual(["2-3"]);
  });

  it("never echoes a node it already lit", () => {
    for (const n of net.nodes) {
      const l = lightingFor(net, n.id);
      for (const id of l.echo) expect(l.lit).not.toContain(id);
    }
  });
});

describe("nearestLabelled", () => {
  it("finds the closest labelled node within reach, ignoring fillers", () => {
    expect(nearestLabelled(tiny, 105, 5, 50)).toBe(1);
    expect(nearestLabelled(tiny, 0, 0, 150)).toBe(1); // node 0 is closer but unlabelled
    expect(nearestLabelled(tiny, 290, 0, 50)).toBe(3);
  });

  it("returns null when nothing labelled is within reach", () => {
    expect(nearestLabelled(tiny, 200, 200, 50)).toBeNull();
  });

  it("skips the nodes the caller rejects", () => {
    expect(nearestLabelled(tiny, 105, 5, 250, (id) => id !== 1)).toBe(3);
    expect(nearestLabelled(tiny, 105, 5, 50, (id) => id !== 1)).toBeNull();
    expect(nearestLabelled(tiny, 105, 5, 250, () => false)).toBeNull();
  });
});

// Screen geometry in CSS px: a 600×800 pane with a 400×400 portrait in the middle.
const pane: Box = { left: 0, top: 0, right: 600, bottom: 800 };
const portrait: Box = { left: 100, top: 200, right: 500, bottom: 600 };

describe("visibleBox", () => {
  it("keeps the part of the pane inside the viewport, inset on every side", () => {
    expect(visibleBox({ left: -20, top: 300, right: 1500, bottom: 1400 }, 1440, 900)).toEqual({
      left: 4,
      top: 304,
      right: 1436,
      bottom: 896,
    });
    expect(visibleBox({ left: 100, top: 100, right: 200, bottom: 200 }, 1440, 900, 10)).toEqual({
      left: 110,
      top: 110,
      right: 190,
      bottom: 190,
    });
  });

  it("leaves nothing visible when the pane is below the fold", () => {
    const below = visibleBox({ left: 0, top: 1000, right: 600, bottom: 1800 }, 600, 900);
    expect(isDotVisible({ x: 300, y: 1100 }, below, portrait)).toBe(false);
  });
});

describe("isDotVisible", () => {
  it("accepts a dot inside the pane and clear of the portrait", () => {
    expect(isDotVisible({ x: 50, y: 100 }, pane, portrait)).toBe(true);
    expect(isDotVisible({ x: 300, y: 700 }, pane, portrait)).toBe(true);
  });

  it("rejects a dot under the portrait, or within the margin around it", () => {
    expect(isDotVisible({ x: 300, y: 400 }, pane, portrait)).toBe(false);
    expect(isDotVisible({ x: 95, y: 400 }, pane, portrait)).toBe(false); // 5px out: inside 8
    expect(isDotVisible({ x: 90, y: 400 }, pane, portrait)).toBe(true); // 10px out
    expect(isDotVisible({ x: 95, y: 400 }, pane, portrait, 2)).toBe(true);
  });

  it("rejects a dot outside the visible pane", () => {
    expect(isDotVisible({ x: -1, y: 100 }, pane, portrait)).toBe(false);
    expect(isDotVisible({ x: 50, y: 801 }, pane, portrait)).toBe(false);
  });
});

describe("labelSide", () => {
  // Labels sit 10px from the dot and stay 8px off the portrait. "start" = right of the dot.
  it("puts the label on the side away from the portrait's centre when it fits", () => {
    expect(labelSide({ x: 520, y: 100 }, 60, 14, pane, portrait)).toBe("start");
    expect(labelSide({ x: 520, y: 700 }, 60, 14, pane, portrait)).toBe("start");
    expect(labelSide({ x: 80, y: 100 }, 60, 14, pane, portrait)).toBe("end");
  });

  it("falls back to the other side when the preferred one leaves the pane", () => {
    // Right of centre, 50px from the pane's right edge: an 80px label only fits on the left.
    expect(labelSide({ x: 550, y: 100 }, 80, 14, pane, portrait)).toBe("end");
    // Left of centre, 40px from the pane's left edge: it only fits on the right.
    expect(labelSide({ x: 40, y: 700 }, 80, 14, pane, portrait)).toBe("start");
  });

  it("never lets the label cross the portrait or its margin", () => {
    // Beside the portrait's left edge: the left side fits only if the pane has room there...
    expect(labelSide({ x: 90, y: 400 }, 100, 14, { ...pane, left: -100 }, portrait)).toBe("end");
    // ...otherwise the right side would run over the photo.
    expect(labelSide({ x: 90, y: 400 }, 100, 14, pane, portrait)).toBeNull();
    // 12px above the portrait, a 14px-high label reaches within 5px of it; 20px above, it clears.
    expect(labelSide({ x: 300, y: 188 }, 60, 14, pane, portrait)).toBeNull();
    expect(labelSide({ x: 300, y: 180 }, 60, 14, pane, portrait)).toBe("start");
  });

  it("returns null when neither side fits", () => {
    expect(labelSide({ x: 300, y: 100 }, 400, 14, pane, portrait)).toBeNull();
  });

  it("measures the gap it is given", () => {
    // 20px from the pane's right edge: a 10px label fits with a 5px gap, not with 15px.
    expect(labelSide({ x: 580, y: 100 }, 10, 14, pane, portrait, 5)).toBe("start");
    expect(labelSide({ x: 580, y: 100 }, 10, 14, pane, portrait, 15)).toBe("end");
  });
});
