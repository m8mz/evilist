import { describe, expect, it } from "vitest";
import { tracksPointer } from "../src/scripts/stack-network";

describe("tracksPointer", () => {
  it("follows a mouse or a pen, never a finger (touch drags scroll the page)", () => {
    expect(tracksPointer("mouse")).toBe(true);
    expect(tracksPointer("pen")).toBe(true);
    expect(tracksPointer("touch")).toBe(false);
  });
});
