import type { ShelfStatus } from "./types";

/** Parse the CSV from Goodreads → My Books → Import and export → Export library. */
export interface GoodreadsRow {
  id?: string;
  isbn13?: string;
  title: string;
  author?: string;
  rating?: number;
  status: ShelfStatus;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function parseGoodreadsExport(text: string): GoodreadsRow[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  if (!header) return [];
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const iId = col("book id"), iTitle = col("title"), iAuthor = col("author"), iIsbn = col("isbn13"), iRating = col("my rating"), iShelf = col("exclusive shelf");
  if (iTitle < 0) throw new Error("This doesn't look like a Goodreads library export (no Title column).");
  return rows.map((r): GoodreadsRow => {
    const shelf = (r[iShelf] ?? "").trim();
    const rating = Number(r[iRating]);
    return {
      id: r[iId]?.trim() || undefined,
      isbn13: (r[iIsbn] ?? "").replace(/[^0-9X]/gi, "") || undefined,
      title: (r[iTitle] ?? "").trim(),
      author: r[iAuthor]?.trim() || undefined,
      rating: rating >= 1 && rating <= 5 ? rating : undefined,
      status: shelf === "read" ? "read" : shelf === "currently-reading" ? "reading" : "want",
    };
  }).filter((r) => r.title);
}
