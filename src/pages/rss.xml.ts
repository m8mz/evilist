import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const notes = await getCollection("notes", ({ data }) => !data.draft);
  return rss({
    title: "Marcus Hancock-Gaillard — Notes",
    description: "Notes on infrastructure, careers, and building things.",
    site: context.site!,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.pubDate,
      link: `/notes/${note.id}/`,
    })),
  });
}
