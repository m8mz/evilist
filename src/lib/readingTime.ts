const WORDS_PER_MINUTE = 220;

/** "N min read" for a Markdown/MDX body. Code blocks are skipped; they're scanned, not read. */
export function readingTime(markdown: string): string {
  const prose = markdown.replace(/```[\s\S]*?```/g, " ").replace(/[#*_>`[\]()!-]/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))} min read`;
}
