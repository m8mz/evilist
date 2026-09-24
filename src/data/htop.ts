// The htop band's snapshot (spec §6.1a): a simulated view of the stack this site runs on:
// Linux, Podman, HAProxy and Node. Generic names only: no hostnames, IPs or real users.
export interface HtopProcess {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  time: string;
  command: string;
}

export interface HtopSnapshot {
  /** Busy % per core, 0–100. */
  cores: number[];
  /** GiB. */
  memory: { used: number; total: number };
  swap: { used: number; total: number };
  tasks: string;
  load: [number, number, number];
  uptime: string;
  /** Sorted by CPU%, highest first; the first row is htop's selected row. */
  processes: HtopProcess[];
}

export const htop: HtopSnapshot = {
  cores: [42.0, 18.5, 27.3, 9.1],
  memory: { used: 3.1, total: 7.7 },
  swap: { used: 0, total: 2 },
  tasks: "63, 118 thr; 2 running",
  load: [0.42, 0.38, 0.31],
  uptime: "41 days, 03:12:09",
  processes: [
    {
      pid: 812,
      user: "web",
      cpu: 4.2,
      mem: 1.8,
      time: "3:14.07",
      command: "haproxy -W -db -f /usr/local/etc/haproxy/haproxy.cfg",
    },
    {
      pid: 944,
      user: "web",
      cpu: 2.9,
      mem: 6.3,
      time: "1:52.40",
      command: "node ./dist/server/entry.mjs",
    },
    {
      pid: 2210,
      user: "root",
      cpu: 1.1,
      mem: 1.2,
      time: "0:06.02",
      command: "dnf-automatic /etc/dnf/automatic.conf --timer",
    },
    {
      pid: 731,
      user: "web",
      cpu: 0.7,
      mem: 0.9,
      time: "0:41.12",
      command: "conmon --api-version 1 -c evilist-web",
    },
    {
      pid: 1203,
      user: "root",
      cpu: 0.3,
      mem: 0.5,
      time: "0:09.81",
      command: "/usr/lib/systemd/systemd-journald",
    },
    {
      pid: 1,
      user: "root",
      cpu: 0.1,
      mem: 0.4,
      time: "0:12.55",
      command: "/usr/lib/systemd/systemd --system --deserialize 31",
    },
    {
      pid: 655,
      user: "root",
      cpu: 0,
      mem: 0.2,
      time: "0:03.10",
      command: "sshd: /usr/sbin/sshd -D [listener]",
    },
    {
      pid: 690,
      user: "chrony",
      cpu: 0,
      mem: 0.1,
      time: "0:01.44",
      command: "/usr/sbin/chronyd -F 2",
    },
  ],
};
