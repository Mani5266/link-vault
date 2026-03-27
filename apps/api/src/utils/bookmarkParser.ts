import * as cheerio from "cheerio";
import { isValidUrl, normalizeUrl } from "@linkvault/shared";
import type { BookmarkImportItem } from "@linkvault/shared";
import { LIMITS } from "@linkvault/shared";

// ============================================================
// Bookmark Parser — Parses Netscape Bookmark File Format (HTML)
// Exported by Chrome, Firefox, Safari, Edge, and most browsers.
//
// Structure:
//   <DL><p>
//     <DT><H3 ADD_DATE="...">Folder</H3>
//     <DL><p>
//       <DT><A HREF="url" ADD_DATE="timestamp">Title</A>
//     </DL><p>
//   </DL><p>
// ============================================================

/**
 * Parse a browser-exported bookmarks HTML file and extract links.
 * Returns a flat array of BookmarkImportItem regardless of folder depth.
 */
export function parseBookmarksHtml(html: string): BookmarkImportItem[] {
  if (!html || html.length === 0) {
    throw new Error("Empty bookmark file.");
  }

  if (html.length > LIMITS.MAX_IMPORT_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size is ${Math.round(LIMITS.MAX_IMPORT_FILE_SIZE / 1024 / 1024)} MB.`
    );
  }

  const $ = cheerio.load(html);
  const bookmarks: BookmarkImportItem[] = [];
  const seenUrls = new Set<string>();

  // Find all <A> tags inside <DT> elements (standard bookmark format)
  $("dt > a").each((_index, element) => {
    const el = $(element);
    const href = el.attr("href");
    const title = el.text().trim();
    const addDate = el.attr("add_date");

    if (!href) return;

    // Skip non-http(s) URLs (javascript:, data:, file:, place:, etc.)
    if (!href.startsWith("http://") && !href.startsWith("https://")) return;

    // Validate URL
    if (!isValidUrl(href)) return;

    // Normalize to deduplicate
    let normalized: string;
    try {
      normalized = normalizeUrl(href);
    } catch {
      normalized = href;
    }

    // Skip duplicates within the file
    if (seenUrls.has(normalized)) return;
    seenUrls.add(normalized);

    const item: BookmarkImportItem = {
      url: normalized,
    };

    if (title && title.length > 0) {
      item.title = title.slice(0, LIMITS.MAX_TITLE_LENGTH);
    }

    if (addDate) {
      const timestamp = parseInt(addDate, 10);
      if (!isNaN(timestamp) && timestamp > 0) {
        item.add_date = timestamp;
      }
    }

    bookmarks.push(item);
  });

  return bookmarks;
}
