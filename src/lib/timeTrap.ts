// Time-trap token: an HMAC-signed render timestamp embedded in the form. Bots that post instantly,
// or replay a form hours later, fail verification. Humans never notice it.
import { createHmac, timingSafeEqual } from "node:crypto";

export type TrapResult = "ok" | "too-fast" | "expired" | "invalid";

const MIN_MS = 3_000;
const MAX_MS = 60 * 60 * 1000;

const sign = (timestamp: string, secret: string) =>
  createHmac("sha256", secret).update(timestamp).digest("base64url");

export function issueToken(secret: string, now: number = Date.now()): string {
  const timestamp = String(now);
  return `${timestamp}.${sign(timestamp, secret)}`;
}

export function verifyToken(token: string, secret: string, now: number = Date.now()): TrapResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !parts[1]) return "invalid";

  const [timestamp, signature] = parts;
  const expected = Buffer.from(sign(timestamp, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "invalid";

  const age = now - Number(timestamp);
  if (age < MIN_MS) return "too-fast";
  if (age > MAX_MS) return "expired";
  return "ok";
}
