import { ActionError, defineAction } from "astro:actions";
import sgMail from "@sendgrid/mail";
import { CONTACT_DRY_RUN, CONTACT_FROM, CONTACT_TO, SENDGRID_API_KEY } from "astro:env/server";
import { contactSchema, isHoneypotFilled } from "../lib/contactSchema";
import { buildEmail } from "../lib/contactEmail";
import { clientIp, createRateLimiter } from "../lib/rateLimit";
import { verifyToken } from "../lib/timeTrap";
import { formSecret } from "../lib/formSecret";

// 3 messages per 10 minutes per client IP (HAProxy applies its own, coarser limit at the edge).
const limiter = createRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

export const contact = defineAction({
  accept: "form",
  input: contactSchema,
  handler: async (input, context) => {
    const ip = clientIp(context.request.headers, context.clientAddress);
    if (!limiter.check(ip)) {
      throw new ActionError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many messages from your network. Try again in about 10 minutes.",
      });
    }

    // Bots that fill the hidden field get a normal-looking success and nothing is sent.
    if (isHoneypotFilled(input)) return { sent: true };

    const trap = verifyToken(input.ts, formSecret);
    if (trap === "too-fast") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "That was faster than we expected. Wait a moment, then send again.",
      });
    }
    if (trap !== "ok") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "This form has expired. Reload the page and send your message again.",
      });
    }

    const email = buildEmail(input);
    if (CONTACT_DRY_RUN) {
      console.info(`[contact] dry run: ${input.type} message not sent`);
      return { sent: true };
    }

    try {
      sgMail.setApiKey(SENDGRID_API_KEY);
      await sgMail.send({
        from: CONTACT_FROM,
        to: CONTACT_TO,
        replyTo: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    } catch (error) {
      // Log the failure without the visitor's details.
      const code = (error as { code?: number }).code ?? "unknown";
      console.error(`[contact] SendGrid send failed (code ${code})`);
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Your message couldn't be sent right now. Please try again later.",
      });
    }

    return { sent: true };
  },
});
