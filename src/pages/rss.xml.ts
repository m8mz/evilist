import rss from "@astrojs/rss";
import { getPublishedNotes } from "../lib/notes";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const notes = await getPublishedNotes();
  return rss({
    title: "Marcus Hancock-Gaillard — Notes",
    description: "Notes on infrastructure, careers, and building things.",
    site: context.site!,
    // Match the site's trailingSlash: "never"; the feed would otherwise add a slash to each link.
    trailingSlash: false,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.pubDate,
      link: `/notes/${note.id}`,
    })),
  });
}
