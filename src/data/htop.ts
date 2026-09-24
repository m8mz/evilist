// A simulated htop of the stack this site runs on (spec §4.2): the hero's terminal pane and the
// social card. Linux, Podman, HAProxy and Node. Generic names only: no hostnames, IPs or real users.
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
    {
      pid: 1180,
      user: "root",
      cpu: 0,
      mem: 0.3,
      time: "0:02.71",
      command: "/usr/lib/systemd/systemd-logind",
    },
    {
      pid: 1022,
      user: "root",
      cpu: 0,
      mem: 0.2,
      time: "0:04.33",
      command: "/usr/bin/dbus-broker-launch --scope system",
    },
    {
      pid: 1310,
      user: "root",
      cpu: 0,
      mem: 0.6,
      time: "0:07.92",
      command: "/usr/sbin/NetworkManager --no-daemon",
    },
    {
      pid: 1288,
      user: "root",
      cpu: 0,
      mem: 0.9,
      time: "0:05.18",
      command: "/usr/bin/python3 -s /usr/sbin/firewalld --nofork --nopid",
    },
    { pid: 1402, user: "root", cpu: 0, mem: 0.1, time: "0:00.88", command: "/usr/sbin/crond -n" },
    { pid: 1044, user: "root", cpu: 0, mem: 0.1, time: "0:01.06", command: "/sbin/auditd" },
    {
      pid: 1356,
      user: "root",
      cpu: 0,
      mem: 0.2,
      time: "0:03.47",
      command: "/usr/sbin/rsyslogd -n",
    },
    {
      pid: 1391,
      user: "root",
      cpu: 0,
      mem: 0.1,
      time: "0:00.41",
      command: "/sbin/agetty --noclear tty1 linux",
    },
    {
      pid: 612,
      user: "root",
      cpu: 0,
      mem: 0.2,
      time: "0:01.93",
      command: "/usr/lib/systemd/systemd-udevd",
    },
    {
      pid: 1507,
      user: "web",
      cpu: 0,
      mem: 0.4,
      time: "0:00.97",
      command: "/usr/lib/systemd/systemd --user",
    },
    { pid: 1611, user: "web", cpu: 0, mem: 0.1, time: "0:00.12", command: "catatonit -P" },
    {
      pid: 1127,
      user: "root",
      cpu: 0,
      mem: 0.1,
      time: "0:00.72",
      command: "/usr/sbin/irqbalance --foreground",
    },
    {
      pid: 1705,
      user: "root",
      cpu: 0,
      mem: 0.3,
      time: "0:01.35",
      command: "/usr/bin/python3 -Es /usr/sbin/tuned -l -P",
    },
    { pid: 2, user: "root", cpu: 0, mem: 0, time: "0:00.03", command: "[kthreadd]" },
    { pid: 14, user: "root", cpu: 0, mem: 0, time: "0:01.12", command: "[rcu_preempt]" },
    {
      pid: 88,
      user: "root",
      cpu: 0,
      mem: 0,
      time: "0:00.51",
      command: "[kworker/u8:3-events_unbound]",
    },
  ],
};
