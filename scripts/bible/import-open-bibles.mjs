/** Refresh the catalog from the publisher's rights listings and each edition's
 * own notice. Run: node scripts/bible/import-open-bibles.mjs
 * Optional EBIBLE_LICENSE_CACHE is an HTML cache directory for repeat audits.
 * This imports Scripture metadata, never publisher illustrations or logos.
 */
import { load } from "cheerio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { classifyLicense } from "./license.mjs";
const exec = promisify(execFile);
const fetchHtml = async (url) =>
  (await exec("curl", ["-fsSL", "--max-time", "20", url], { maxBuffer: 4 * 1024 * 1024 })).stdout;
const $ = load(await fetchHtml("https://ebible.org/Scriptures/copyright.php"));
const candidates = [];
$("table")
  .slice(0, 2)
  .find("tr")
  .each((_, row) => {
    const c = $(row).find("td");
    if (c.length !== 12) return;
    const source = c.eq(9).find("a").attr("href");
    if (!source) return;
    const slug = new URL(source).pathname.split("/")[1];
    if (!/^[A-Za-z0-9-]+$/.test(slug)) return;
    candidates.push({
      slug,
      language: c.eq(0).text().trim(),
      label: c.eq(4).text().trim(),
      title: c.eq(3).text().trim(),
      short: c.eq(10).text().trim(),
      credit: [6, 7, 8]
        .map((i) => c.eq(i).text().trim())
        .filter((s) => s && s !== "Public Domain")
        .join("; "),
      listedPublicDomain: c.eq(6).text().trim() === "Public Domain",
    });
  });
const cache = process.env.EBIBLE_LICENSE_CACHE;
if (cache) await mkdir(cache, { recursive: true });
const editions = [];
let cursor = 0,
  skipped = 0;
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (cursor < candidates.length) {
      const row = candidates[cursor++];
      const sourceUrl = `https://ebible.org/${row.slug}/copyright.htm`;
      try {
        let html;
        try {
          html = cache ? await readFile(join(cache, `${row.slug}.html`), "utf8") : undefined;
        } catch {
          /* fetch uncached notice */
        }
        if (!html) {
          html = await fetchHtml(sourceUrl);
          if (cache) await writeFile(join(cache, `${row.slug}.html`), html);
        }
        const rights = classifyLicense(html, row.listedPublicDomain);
        if (!rights) {
          skipped++;
          continue;
        }
        const page = load(html);
        const description = page("h2").first().text().trim();
        const notice = page("h2")
          .first()
          .nextAll("p")
          .first()
          .text()
          .split(/Language:/)[0]
          .replace(/\s+/g, " ")
          .trim();
        const scope = /portions|selected books/i.test(description)
          ? "Portions"
          : /new testament/i.test(description) && !/old testament|holy bible/i.test(description)
            ? "New Testament"
            : "See source coverage";
        editions.push({
          id: `ebible:${row.slug}`,
          slug: row.slug,
          label: row.slug === "swh1850" ? "Kiswahili Kimvita (1850 NT portions)" : row.label,
          title: row.title,
          short: row.short,
          language: row.language,
          ...rights,
          licenseUrl: rights.licenseUrl || sourceUrl,
          sourceUrl,
          credit:
            notice && rights.license !== "Public domain" ? `${notice}; ${row.credit}` : row.credit,
          scope,
        });
      } catch {
        skipped++;
      }
    }
  }),
);
editions.sort(
  (a, b) =>
    a.language.localeCompare(b.language) ||
    a.label.localeCompare(b.label) ||
    a.slug.localeCompare(b.slug),
);
const type = `export type OpenBibleTranslation = { id: string; slug: string; label: string; title: string; short: string; language: string; license: string; licenseUrl: string; sourceUrl: string; credit: string; scope: string; };\n`;
await writeFile(
  "src/lib/bibleCatalog.ts",
  `${type}// Reuse notices verified on ${new Date().toISOString().slice(0, 10)}; refresh with scripts/bible/import-open-bibles.mjs.\nexport const EBIBLE_TRANSLATIONS: readonly OpenBibleTranslation[] = ${JSON.stringify(editions, null, 2)};\n`,
);
console.log(
  `Imported ${editions.length} editions; ${skipped} restricted, unclear or unavailable notices excluded.`,
);
