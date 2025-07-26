import { defineAction } from "astro:actions";
import { z } from "astro:schema";

import sgMail from "@sendgrid/mail";
sgMail.setApiKey(import.meta.env.SENDGRID_API_KEY);

export const server = {
  sendEmail: defineAction({
    accept: "form",
    input: z.object({
      name: z.string(),
      message: z.string(),
    }),
    handler: async (input) => {
      await sgMail.send({
        from: "no-reply@evilist.co",
        to: "m@evilist.co",
        subject: `New message from ${input.name}`,
        text: input.message,
      });
      return { success: true };
    },
  }),
};
