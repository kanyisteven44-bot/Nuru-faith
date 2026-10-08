import { load } from "cheerio";

// Accept only explicit, unrestricted reuse grants. NC/ND editions need a
// separate product decision and are deliberately excluded from this importer.
export function classifyLicense(html, listedPublicDomain) {
  const $ = load(html);
  const urls = $("a[href]")
    .map((_, a) => $(a).attr("href"))
    .get();
  const restricted = urls.some((url) =>
    /creativecommons\.org\/licenses\/[^/]*(?:nc|nd)/i.test(url),
  );
  if (restricted) return null;
  if (listedPublicDomain && /public domain/i.test($("body").text()))
    return { license: "Public domain", licenseUrl: null };
  const url = urls.find((url) =>
    /^https?:\/\/creativecommons\.org\/(?:licenses\/by(?:-sa)?\/[\d.]+|publicdomain\/(?:zero|mark)\/1\.0)\/?$/i.test(
      url,
    ),
  );
  if (!url) return null;
  return {
    license: url.includes("/by-sa/")
      ? "CC BY-SA"
      : url.includes("/by/")
        ? "CC BY"
        : url.includes("/mark/")
          ? "Public domain"
          : "CC0",
    licenseUrl: url.replace(/^http:/, "https:"),
  };
}
