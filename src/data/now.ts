// What Marcus is running, playing, watching and building right now. The single source for the
// home page's off-the-clock block and the /now page. Edit freely; test/now.test.ts keeps it sane.
export interface NowData {
  /** Month of the last edit, yyyy-mm. Shown on /now as "updated: 2026-09". */
  updated: string;
  rig: { key: string; value: string }[];
  playing: string[];
  watching: string[];
  learning: string[];
  building: string[];
  /** `weeks` is a 12-bar texture in [0, 1], not a training log: no numbers are ever shown. */
  training: { line: string; weeks: number[] };
}

export const now: NowData = {
  updated: "2026-09",
  rig: [
    { key: "work", value: "MacBook Pro (M2 Max)" },
    { key: "cpu", value: "AMD Ryzen 7 7800X3D" },
    { key: "gpu", value: "XFX Speedster MERC310 Radeon RX 7900 XTX, 24 GB" },
    { key: "board", value: "ASUS TUF Gaming B650E-E WiFi" },
    { key: "case", value: "Montech King 95 Pro, dual chamber" },
  ],
  playing: [
    "Call of Duty",
    "World of Warcraft",
    "League of Legends",
    "Old School RuneScape",
    "Steam co-op with friends",
  ],
  watching: ["Naruto", "Solo Leveling", "Demon Slayer"],
  learning: ["Go tooling for infrastructure"],
  building: ["this site (Astro 7, self-hosted behind HAProxy)"],
  training: {
    line: "lifting, for health",
    weeks: [0.6, 0.8, 0.8, 1, 0.6, 0.8, 1, 0.8, 0.4, 0.8, 1, 0.8],
  },
};
