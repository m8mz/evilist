import { getCollection, type CollectionEntry } from "astro:content";

export type Note = CollectionEntry<"notes">;

/** Published notes, newest first. */
export async function getPublishedNotes(): Promise<Note[]> {
  const notes = await getCollection("notes", ({ data }) => !data.draft);
  return notes.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
