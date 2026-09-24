// Server-only secret for signing time-trap tokens. Set FORM_SECRET in production so tokens survive
// restarts; without it a random per-process secret is used (forms rendered before a restart expire).
import { randomBytes } from "node:crypto";
import { FORM_SECRET } from "astro:env/server";

export const formSecret: string = FORM_SECRET ?? randomBytes(32).toString("hex");
