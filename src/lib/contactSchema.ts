import { z } from "astro/zod";

export const BUDGETS = {
  "under-5k": "Under $5k",
  "5k-15k": "$5k–$15k",
  "15k-50k": "$15k–$50k",
  "50k-plus": "$50k+",
  "not-sure": "Not sure yet",
} as const;

export type Budget = keyof typeof BUDGETS;

const text = (max: number) =>
  z
    .string({ error: "This field is required." })
    .trim()
    .min(1, { error: "This field is required." })
    .max(max, { error: `Keep this under ${max} characters.` });
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters.` })
    .nullish() // Astro parses absent form fields as null
    .transform((value) => value || undefined);

const common = {
  name: text(120),
  email: z.email({ error: "Enter a valid email address, like name@company.com." }).max(254),
  // Honeypot: hidden from people, filled in by naive bots. Accepted here (so bots get no
  // validation signal) and silently dropped by the action; see isHoneypotFilled.
  website: z.string().max(2000).nullish(),
  // Time-trap token, verified in the action handler.
  ts: z.string().max(200),
};

export const contactSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("recruiter"),
    ...common,
    company: text(120),
    role: optionalText(160),
    message: text(5000),
  }),
  z.object({
    type: z.literal("client"),
    ...common,
    company: optionalText(120),
    budget: z.enum(Object.keys(BUDGETS) as [Budget, ...Budget[]], {
      error: "Choose a budget range.",
    }),
    details: text(5000),
  }),
]);

export type ContactInput = z.infer<typeof contactSchema>;

export function isHoneypotFilled(input: ContactInput): boolean {
  return Boolean(input.website?.trim());
}
