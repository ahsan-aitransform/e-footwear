// CSV export of the report screens (docx: Product Ledger, Product Report and Stock with Sizes can be exported). No library.
// A cell that starts with = + - @ is prefixed with an apostrophe so a spreadsheet never runs it as a formula; text with a comma,
// quote or line break is quoted. A byte order mark lets Excel read Urdu text correctly.

const FORMULA_STARTERS = new Set(["=", "+", "-", "@"]);
const BYTE_ORDER_MARK = "﻿";

export type CsvCell = string | number | null | undefined;

function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  let text = String(cell);
  // A negative number is not a formula; only text is protected.
  if (typeof cell === "string" && text.length > 0 && FORMULA_STARTERS.has(text[0])) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsvText(headers: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [headers, ...rows].map((line) => line.map(escapeCell).join(","));
  return `${BYTE_ORDER_MARK}${lines.join("\r\n")}\r\n`;
}

// Hands the text to the browser as a file download.
export function downloadCsvFile(fileName: string, csvText: string): void {
  const url = URL.createObjectURL(new Blob([csvText], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
