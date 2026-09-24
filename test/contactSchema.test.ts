import { describe, expect, it } from "vitest";
import { contactSchema, isHoneypotFilled } from "../src/lib/contactSchema";
import { buildEmail } from "../src/lib/contactEmail";

const recruiter = {
  type: "recruiter",
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines",
  role: "Staff Infrastructure Engineer",
  message: "We'd like to talk about a role.",
  website: "",
  ts: "123.sig",
};

const client = {
  type: "client",
  name: "Grace Hopper",
  email: "grace@example.com",
  company: "",
  budget: "5k-15k",
  details: "Need an HAProxy config review.",
  website: "",
  ts: "123.sig",
};

describe("contactSchema", () => {
  it("accepts a complete recruiter message", () => {
    expect(contactSchema.safeParse(recruiter).success).toBe(true);
  });

  it("accepts a client message without a company", () => {
    expect(contactSchema.safeParse(client).success).toBe(true);
  });

  it("requires the fields for the chosen form type", () => {
    const { message: _m, ...noMessage } = recruiter;
    expect(contactSchema.safeParse(noMessage).success).toBe(false);
    const { details: _d, ...noDetails } = client;
    expect(contactSchema.safeParse(noDetails).success).toBe(false);
  });

  it("treats absent optional fields as empty (Astro parses missing form fields as null)", () => {
    const parsed = contactSchema.safeParse({ ...recruiter, role: null, website: null });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.type === "recruiter" && parsed.data.role).toBe(undefined);
    expect(contactSchema.safeParse({ ...client, company: null }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(contactSchema.safeParse({ ...recruiter, email: "not-an-email" }).success).toBe(false);
  });

  it("accepts a filled honeypot (so bots get no signal) but flags it", () => {
    const parsed = contactSchema.parse({ ...recruiter, website: "http://spam.example" });
    expect(isHoneypotFilled(parsed)).toBe(true);
    expect(isHoneypotFilled(contactSchema.parse(recruiter))).toBe(false);
  });

  it("rejects an unknown budget and an unknown form type", () => {
    expect(contactSchema.safeParse({ ...client, budget: "a-million" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...recruiter, type: "bug" }).success).toBe(false);
  });

  it("trims whitespace and rejects blank required text", () => {
    const parsed = contactSchema.safeParse({ ...recruiter, name: "  Ada  " });
    expect(parsed.success && parsed.data.name).toBe("Ada");
    expect(contactSchema.safeParse({ ...recruiter, message: "   " }).success).toBe(false);
  });

  it("explains errors in plain language", () => {
    const result = contactSchema.safeParse({ ...recruiter, email: "nope", message: "" });
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages).toContain("Enter a valid email address, like name@company.com.");
    expect(messages).toContain("This field is required.");
  });

  it("caps message length", () => {
    expect(contactSchema.safeParse({ ...recruiter, message: "x".repeat(5001) }).success).toBe(
      false,
    );
  });
});

describe("buildEmail", () => {
  it("escapes user input in the HTML body", () => {
    const parsed = contactSchema.parse({ ...recruiter, name: "<img src=x onerror=alert(1)>" });
    const email = buildEmail(parsed);
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
  });

  it("puts the form type and sender in the subject, without newlines", () => {
    const parsed = contactSchema.parse({ ...recruiter, name: "Ada\r\nBcc: evil@example.com" });
    const email = buildEmail(parsed);
    expect(email.subject).toMatch(/^Recruiter: /);
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it("uses the sender's address as reply-to", () => {
    expect(buildEmail(contactSchema.parse(client)).replyTo).toBe("grace@example.com");
  });

  it("includes the human-readable budget for clients", () => {
    expect(buildEmail(contactSchema.parse(client)).text).toContain("$5k–$15k");
  });
});
