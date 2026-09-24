import { BUDGETS, type ContactInput } from "./contactSchema";
import { escapeHtml, textToHtml } from "./escapeHtml";

export interface ContactEmail {
  subject: string;
  text: string;
  html: string;
  replyTo: string;
}

/** Collapse whitespace (incl. CR/LF) so user input can never inject header lines. */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export function buildEmail(input: ContactInput): ContactEmail {
  const rows: [string, string][] = [
    ["Name", input.name],
    ["Email", input.email],
  ];
  let body: string;

  if (input.type === "recruiter") {
    rows.push(["Company", input.company]);
    if (input.role) rows.push(["Role", input.role]);
    body = input.message;
  } else {
    if (input.company) rows.push(["Company", input.company]);
    rows.push(["Budget", BUDGETS[input.budget]]);
    body = input.details;
  }

  const label = input.type === "recruiter" ? "Recruiter" : "Client";
  const subject = oneLine(`${label}: ${input.name}${input.company ? ` (${input.company})` : ""}`);

  const text = [...rows.map(([k, v]) => `${k}: ${oneLine(v)}`), "", body].join("\n");
  const html = [
    `<h2>${escapeHtml(label)} message</h2>`,
    "<table>",
    ...rows.map(
      ([k, v]) => `<tr><th align="left">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`,
    ),
    "</table>",
    `<p>${textToHtml(body)}</p>`,
  ].join("\n");

  return { subject, text, html, replyTo: input.email };
}
