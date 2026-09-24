import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import sgMail from "@sendgrid/mail";
import { SENDGRID_API_KEY, CONTACT_TO, CONTACT_FROM, CONTACT_DRY_RUN } from "astro:env/server";

// Minimal Astro 7 / Zod 4 port of the original action so the build works.
// Full rewrite (discriminated union, escaping, spam defenses) lands in Phase 3.
export const server = {
  sendEmail: defineAction({
    accept: "form",
    input: z.object({
      type: z.enum(["personal", "business"]),
      name: z.string().min(1).max(200),
      email: z.email(),
      message: z.string().max(5000).optional(),
      company: z.string().max(200).optional(),
      budget: z.string().max(100).optional(),
      details: z.string().max(5000).optional(),
    }),
    handler: async (input) => {
      const subject =
        input.type === "business"
          ? `Business inquiry from ${input.name}`
          : `Personal inquiry from ${input.name}`;
      const text = [
        `From: ${input.name} <${input.email}>`,
        input.company && `Company: ${input.company}`,
        input.budget && `Budget: ${input.budget}`,
        "",
        input.message ?? input.details ?? "",
      ]
        .filter((line): line is string => typeof line === "string")
        .join("\n");

      if (CONTACT_DRY_RUN) {
        console.info("[contact] dry run, email not sent");
        return { success: true };
      }

      sgMail.setApiKey(SENDGRID_API_KEY);
      // Plain text only until Phase 3 adds HTML escaping.
      await sgMail.send({ from: CONTACT_FROM, to: CONTACT_TO, subject, text });
      return { success: true };
    },
  }),
};
