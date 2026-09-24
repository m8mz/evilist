const WORDS_PER_MINUTE = 220;

/** Whole minutes to read a Markdown/MDX body, at least 1. Code blocks are scanned, not read. */
export function readingMinutes(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, " ").replace(/[#*_>`[\]()!-]/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
