import { defineAction } from "astro:actions";
import { z } from "astro:schema";

import sgMail from "@sendgrid/mail";
sgMail.setApiKey(import.meta.env.SENDGRID_API_KEY);

export const server = {
  sendEmail: defineAction({
    accept: "form",
    input: z.object({
      type: z.enum(["personal", "business", "bug"]),
      name: z.string(),
      email: z.string().email(),
      // Personal form fields
      message: z.string().optional(),
      // Business form fields
      company: z.string().optional(),
      budget: z.string().optional(),
      details: z.string().optional(),
      // Bug report fields
      url: z.string().url().optional(),
      description: z.string().optional(),
      steps: z.string().optional(),
    }),
    handler: async (input) => {
      let subject: string;
      let htmlContent: string;
      let textContent: string;

      switch (input.type) {
        case "personal":
          subject = `💬 Personal Inquiry from ${input.name}`;
          htmlContent = `
            <h2>New Personal Message</h2>
            <p><strong>From:</strong> ${input.name} (${input.email})</p>
            <p><strong>Message:</strong></p>
            <p>${input.message?.replace(/\n/g, '<br>')}</p>
          `;
          textContent = `
Personal Inquiry

From: ${input.name} (${input.email})
Message: ${input.message}
          `;
          break;

        case "business":
          subject = `💼 Business Inquiry from ${input.name} at ${input.company}`;
          htmlContent = `
            <h2>New Business Inquiry</h2>
            <p><strong>From:</strong> ${input.name} (${input.email})</p>
            <p><strong>Company:</strong> ${input.company}</p>
            <p><strong>Budget:</strong> ${input.budget}</p>
            <p><strong>Project Details:</strong></p>
            <p>${input.details?.replace(/\n/g, '<br>')}</p>
          `;
          textContent = `
Business Inquiry

From: ${input.name} (${input.email})
Company: ${input.company}
Budget: ${input.budget}
Project Details: ${input.details}
          `;
          break;

        case "bug":
          subject = `🐛 Bug Report from ${input.name}`;
          htmlContent = `
            <h2>New Bug Report</h2>
            <p><strong>From:</strong> ${input.name} (${input.email})</p>
            <p><strong>Page URL:</strong> <a href="${input.url}">${input.url}</a></p>
            <p><strong>Bug Description:</strong></p>
            <p>${input.description?.replace(/\n/g, '<br>')}</p>
            <p><strong>Steps to Reproduce:</strong></p>
            <p>${input.steps?.replace(/\n/g, '<br>')}</p>
          `;
          textContent = `
Bug Report

From: ${input.name} (${input.email})
Page URL: ${input.url}
Bug Description: ${input.description}
Steps to Reproduce: ${input.steps}
          `;
          break;

        default:
          throw new Error("Invalid contact type");
      }

      await sgMail.send({
        from: "no-reply@evilist.co",
        to: "m@evilist.co",
        subject,
        text: textContent.trim(),
        html: htmlContent,
      });

      return { success: true };
    },
  }),
};
