import { describe, expect, it } from "vitest";
import { buildCode128Bars, encodeCode128ModuleWidths, encodeCode128Symbols } from "./code128";

describe("Code 128 encoder", () => {
  it("encodes text in set B with the right checksum", () => {
    // Start B (104), 'A' = 33, 'B' = 34 -> checksum (104 + 33*1 + 34*2) % 103 = 205 % 103 = 102, stop 106.
    expect(encodeCode128Symbols("AB")).toEqual([104, 33, 34, 102, 106]);
  });

  it("uses set C for a long run of digits", () => {
    // Start C (105), 12 and 34, checksum (105 + 12*1 + 34*2) % 103 = 185 % 103 = 82.
    expect(encodeCode128Symbols("1234")).toEqual([105, 12, 34, 82, 106]);
  });

  it("switches between sets inside one barcode", () => {
    const symbols = encodeCode128Symbols("AB12345");
    expect(symbols[0]).toBe(104);
    expect(symbols).toContain(99);
    expect(symbols[symbols.length - 1]).toBe(106);
  });

  it("gives every symbol 11 modules and the stop 13", () => {
    const widths = encodeCode128ModuleWidths("AB");
    // start + 2 data + checksum = 4 symbols of 11, plus the stop of 13.
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(4 * 11 + 13);
  });

  it("starts and ends with a bar and reports the width with quiet zones", () => {
    const { bars, totalModules } = buildCode128Bars("AB");
    expect(bars[0].x).toBe(10);
    expect(totalModules).toBe(10 + 4 * 11 + 13 + 10);
  });

  it("refuses empty text and characters outside printable ASCII", () => {
    expect(() => encodeCode128Symbols("")).toThrow(RangeError);
    expect(() => encodeCode128Symbols("é")).toThrow(RangeError);
  });
});
