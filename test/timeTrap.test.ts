import { describe, expect, it } from "vitest";
import { issueToken, verifyToken } from "../src/lib/timeTrap";

const SECRET = "test-secret";
const T0 = 1_800_000_000_000;

describe("time-trap token", () => {
  it("accepts a token submitted after the minimum delay", () => {
    const token = issueToken(SECRET, T0);
    expect(verifyToken(token, SECRET, T0 + 5_000)).toBe("ok");
  });

  it("rejects a form submitted faster than a human can type", () => {
    const token = issueToken(SECRET, T0);
    expect(verifyToken(token, SECRET, T0 + 1_000)).toBe("too-fast");
  });

  it("rejects a token older than the maximum age", () => {
    const token = issueToken(SECRET, T0);
    expect(verifyToken(token, SECRET, T0 + 2 * 60 * 60 * 1000)).toBe("expired");
  });

  it("rejects a token whose timestamp was tampered with", () => {
    const [, sig] = issueToken(SECRET, T0).split(".");
    expect(verifyToken(`${T0 - 60_000}.${sig}`, SECRET, T0 + 5_000)).toBe("invalid");
  });

  it("rejects a token signed with a different secret", () => {
    expect(verifyToken(issueToken("other", T0), SECRET, T0 + 5_000)).toBe("invalid");
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "abc", "123.", ".sig", "1.2.3", "notanumber.sig"]) {
      expect(verifyToken(bad, SECRET, T0)).toBe("invalid");
    }
  });
});
