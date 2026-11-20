// v6 stores money as whole rupees, so amounts are shown without paisa.
const nf = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });
const qf = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 3 });

export const money = (v: unknown): string => (v === null || v === undefined || v === "" ? "" : nf.format(Number(v)));
export const qty = (v: unknown): string => (v === null || v === undefined || v === "" ? "" : qf.format(Number(v)));
export const num = (v: unknown): number => (v === null || v === undefined || v === "" ? 0 : Number(v));

/** Round like the server does (half away from zero) so on-screen totals equal posted totals. */
export const round2 = (v: number): number => Math.sign(v) * Math.round(Math.abs(v) * 100 + Number.EPSILON) / 100;

export function dateStr(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTimeStr(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export const today = (): string => new Date().toISOString().slice(0, 10);
export const monthStart = (): string => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10);
};

export function csv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Parse CSV text (quotes supported) into rows of strings. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}
