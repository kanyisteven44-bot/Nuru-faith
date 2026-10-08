import { load } from "cheerio";
import type { AnyNode } from "domhandler";

/** Extract only Scripture nodes, never navigation, headings or footnotes. */
export function parseOpenBibleChapter(html: string, chapter: number) {
  const $ = load(html);
  $(
    "script,style,.footnote,.f,.xref,.x,.s,.s1,.s2,.ms,.mt,.tnav,.nav,.chapterlabel,.copyright,footer,.booklabel,.fine,.notemark,.toc",
  ).remove();
  const verses: { chapter: number; verse: number; text: string }[] = [];
  const markers = $("span.verse[id]");
  markers.each((_, marker) => {
    const id = $(marker).attr("id") ?? "";
    const match = id.match(/^V(\d+)(?:-(\d+))?$/);
    if (!match) return;
    const start = Number(match[1]);
    const next = markers.eq(markers.index(marker) + 1)[0];
    // Walk document nodes until the next verse marker. This includes line
    // breaks and poetry split across paragraphs without taking chapter labels.
    let node: AnyNode | null | undefined = marker;
    let text = "";
    const after = (current: AnyNode | null | undefined): AnyNode | null | undefined => {
      while (current && !current.next) current = current.parent;
      if (current?.type === "tag" && /^(p|div|br|li|blockquote)$/.test(current.name)) text += " ";
      return current?.next;
    };
    node = after(node);
    while (node && node !== next) {
      if (node.type === "text") text += node.data;
      if (node.type === "tag" && $(node).hasClass("verse")) break;
      if ("children" in node && node.children.length) node = node.children[0];
      else {
        if (node.type === "tag" && /^(p|div|br|li|blockquote)$/.test(node.name)) text += " ";
        node = after(node);
      }
    }
    text = text.replace(/\s+/g, " ").trim();
    if (start > 0 && text) verses.push({ chapter, verse: start, text });
  });
  if (!verses.length)
    throw new Error(
      "This translation does not include that chapter. Choose another book or translation.",
    );
  return verses;
}
