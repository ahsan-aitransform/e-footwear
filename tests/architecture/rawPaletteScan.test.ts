import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// THE SINGLE SOURCE OF TRUTH FOR COLOURS (app/globals.css) IS ENFORCED HERE.
// A component that writes bg-slate-100, text-indigo-600 or #4f46e5 bypasses the design tokens and breaks the dark theme.
// Use the semantic classes instead: bg-primary, text-muted-foreground, bg-tone-success-background, ... and
// lib/design/semanticTones.ts for "meaning" colours.

const projectRoot = process.cwd();
const scannedDirectories = ["app", "components", "features", "lib"];
const scannedExtensions = [".ts", ".tsx"];

const PALETTE_NAMES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
// bg-slate-100, text-indigo-600/50, from-violet-700, ring-amber-200 ...
const rawPaletteClassPattern = new RegExp(
  `\\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|divide|shadow|decoration|accent|caret|placeholder)-(?:${PALETTE_NAMES})-\\d{2,3}\\b`,
  "g",
);
const rawHexColourPattern = /#[0-9a-fA-F]{3,8}\b/g;
const rawColourFunctionPattern = /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/g;

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath);
    const isSource = scannedExtensions.some((extension) => entry.endsWith(extension));
    return isSource && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx") ? [fullPath] : [];
  });
}

// Colours may only be defined in app/globals.css (not scanned: it is a .css file). Generated and test files are skipped.
const files = scannedDirectories.flatMap((directory) => listSourceFiles(join(projectRoot, directory)));

describe("design tokens are the only colour source", () => {
  it("scans a meaningful number of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no source file uses a raw Tailwind palette class (bg-slate-100, text-indigo-600, ...)", () => {
    const offenders = files.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(rawPaletteClassPattern)].map((match) => `${relative(projectRoot, file)}: ${match[0]}`),
    );
    expect(offenders).toEqual([]);
  });

  it("no source file contains a hex colour", () => {
    const offenders = files.flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        // an anchor-like "#main-content" is not a colour: only values made of hex digits of a valid length count
        .flatMap((line, index) =>
          [...line.matchAll(rawHexColourPattern)]
            .filter((match) => [3, 4, 6, 8].includes(match[0].length - 1) && !/^#(?:main-content)$/.test(match[0]))
            .map((match) => `${relative(projectRoot, file)}:${index + 1}: ${match[0]}`),
        ),
    );
    expect(offenders).toEqual([]);
  });

  it("no source file builds a colour with rgb()/hsl()/oklch()", () => {
    const offenders = files.flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(rawColourFunctionPattern)].map((match) => `${relative(projectRoot, file)}: ${match[0]}`),
    );
    expect(offenders).toEqual([]);
  });
});
