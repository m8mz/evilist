import { describe, expect, it } from "vitest";
import { FOG_FRAGMENT, FOG_VERTEX, fogUniforms } from "../src/scripts/deck/deck-fog";

describe("the fog shader", () => {
  it("declares every uniform the stage drives", () => {
    for (const name of ["uTime", "uCentre", "uRadius", "uStrength", "uAspect", "uColor"]) {
      expect(FOG_FRAGMENT).toContain(`uniform`);
      expect(FOG_FRAGMENT).toMatch(new RegExp(`uniform\\s+\\w+\\s+${name};`));
    }
    expect(FOG_VERTEX).toContain("gl_Position");
  });
  it("sums three octaves of value noise, scrolled upward, inside a radial falloff", () => {
    expect((FOG_FRAGMENT.match(/vnoise\(/g) ?? []).length).toBeGreaterThanOrEqual(4); // 1 definition + 3 calls
    expect(FOG_FRAGMENT).toContain("smoothstep(0.0, uRadius");
    expect(FOG_FRAGMENT).toContain("uTime");
    expect(FOG_FRAGMENT).toContain("gl_FragColor = vec4(uColor * a, a)");
  });
  it("builds plain uniform objects with the colour", () => {
    const u = fogUniforms([0.2, 0.05, 0.6]);
    expect(u.uColor.value).toEqual([0.2, 0.05, 0.6]);
    expect(u.uStrength.value).toBe(0);
    expect(u.uCentre.value).toEqual([0.5, 0.5]);
    expect(u.uAspect.value).toBe(1);
  });
});
