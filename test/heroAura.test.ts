import { describe, expect, it } from "vitest";
import { shouldRunAura, type AuraEnv } from "../src/scripts/hero-aura";

const capable: AuraEnv = {
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  cores: 8,
  webgl2: true,
};

describe("shouldRunAura", () => {
  it("runs on a capable device", () => {
    expect(shouldRunAura(capable)).toBe(true);
  });

  it("respects reduced motion and data saver", () => {
    expect(shouldRunAura({ ...capable, reducedMotion: true })).toBe(false);
    expect(shouldRunAura({ ...capable, saveData: true })).toBe(false);
  });

  it("skips low-end hardware and missing WebGL2", () => {
    expect(shouldRunAura({ ...capable, deviceMemory: 2 })).toBe(false);
    expect(shouldRunAura({ ...capable, cores: 2 })).toBe(false);
    expect(shouldRunAura({ ...capable, webgl2: false })).toBe(false);
  });

  it("treats unknown memory (Safari, Firefox) as capable", () => {
    expect(shouldRunAura({ ...capable, deviceMemory: undefined })).toBe(true);
  });
});
