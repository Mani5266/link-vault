// ============================================================
// Export Generators — Convert ExportableLink[] to file content
// Supports JSON, CSV, and Netscape Bookmark HTML formats
// ============================================================

import type { ExportableLink, ExportFormat } from "@linkvault/shared";

/**
 * Generate file content for the given format and return it
 * along with the appropriate MIME type and file extension.
 */
export function generateExport(
  links: ExportableLink[],
  format: ExportFormat
): { content: string; mimeType: string; extension: string } {
  switch (format) {
    case "json":
      return {
        content: generateJSON(links),
        mimeType: "application/json",
        extension: "json",
      };
    case "csv":
      return {
        content: generateCSV(links),
        mimeType: "text/csv",
        extension: "csv",
      };
    case "html":
      return {
        content: generateHTML(links),
        mimeType: "text/html",
        extension: "html",
      };
    case "markdown":
      return {
        content: generateMarkdown(links),
        mimeType: "text/markdown",
        extension: "md",
      };
  }
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

// ============================================================
// JSON Export
// ============================================================

function generateJSON(links: ExportableLink[]): string {
  const exportData = {
    exported_at: new Date().toISOString(),
    total: links.length,
    links: links.map((link) => ({
      url: link.url,
      title: link.title,
      description: link.description,
      tags: link.tags,
      category: link.category,
      domain: link.domain,
      is_pinned: link.is_pinned,
      collection: link.collection_name,
      created_at: link.created_at,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

// ============================================================
// CSV Export
// ============================================================

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(links: ExportableLink[]): string {
  const headers = [
    "URL",
    "Title",
    "Description",
    "Tags",
    "Category",
    "Domain",
    "Pinned",
    "Collection",
    "Created At",
  ];

  const rows = links.map((link) => [
    escapeCSV(link.url),
    escapeCSV(link.title),
    escapeCSV(link.description),
    escapeCSV(link.tags.join("; ")),
    escapeCSV(link.category),
    escapeCSV(link.domain),
    link.is_pinned ? "Yes" : "No",
    escapeCSV(link.collection_name),
    escapeCSV(link.created_at),
  ]);

  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  return bom + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// ============================================================
// HTML Export (Netscape Bookmark Format)
// Compatible with Chrome, Firefox, Safari, Edge import
// ============================================================

function escapeHTML(text: string | null | undefined): string {
  if (text == null) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateHTML(links: ExportableLink[]): string {
  // Group links by collection for a structured bookmark file
  const grouped = new Map<string, ExportableLink[]>();

  for (const link of links) {
    const folder = link.collection_name || "Uncategorized";
    if (!grouped.has(folder)) {
      grouped.set(folder, []);
    }
    grouped.get(folder)!.push(link);
  }

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>LinkVault Export</TITLE>
<H1>LinkVault Export</H1>
<DL><p>
`;

  for (const [folder, folderLinks] of grouped) {
    html += `    <DT><H3>${escapeHTML(folder)}</H3>\n`;
    html += `    <DL><p>\n`;

    for (const link of folderLinks) {
      const addDate = Math.floor(
        new Date(link.created_at).getTime() / 1000
      );
      const title = escapeHTML(link.title || link.url);
      const tags = link.tags.length > 0 ? ` TAGS="${escapeHTML(link.tags.join(","))}"` : "";

      html += `        <DT><A HREF="${escapeHTML(link.url)}" ADD_DATE="${addDate}"${tags}>${title}</A>\n`;

      if (link.description) {
        html += `        <DD>${escapeHTML(link.description)}\n`;
      }
    }

    html += `    </DL><p>\n`;
  }

  html += `</DL><p>\n`;

  return html;
}

// ============================================================
// Markdown Export
// Readable, portable format — grouped by collection
// ============================================================

function generateMarkdown(links: ExportableLink[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Group by collection
  const grouped = new Map<string, ExportableLink[]>();
  for (const link of links) {
    const folder = link.collection_name || "Uncategorized";
    if (!grouped.has(folder)) {
      grouped.set(folder, []);
    }
    grouped.get(folder)!.push(link);
  }

  let md = `# LinkVault Export\n\n`;
  md += `> Exported on ${date} — ${links.length} links\n\n`;
  md += `---\n\n`;

  for (const [folder, folderLinks] of grouped) {
    md += `## ${folder}\n\n`;

    for (const link of folderLinks) {
      const title = link.title || link.url;
      md += `- [${title}](${link.url})`;

      // Add metadata on the same line if present
      const meta: string[] = [];
      if (link.category) meta.push(link.category);
      if (link.is_pinned) meta.push("pinned");
      if (link.tags.length > 0) meta.push(link.tags.map((t) => `#${t}`).join(" "));

      if (meta.length > 0) {
        md += ` — ${meta.join(" · ")}`;
      }

      md += `\n`;

      // Description as indented paragraph
      if (link.description) {
        md += `  ${link.description}\n`;
      }
    }

    md += `\n`;
  }

  return md;
}
