import { describe, expect, it } from "vitest";
import { formatContactBalance } from "./contactBalanceFormatting";

const words = { receivable: "Dr", payable: "Cr" };

describe("formatContactBalance", () => {
  it("shows zero without a word", () => {
    expect(formatContactBalance(0, words)).not.toContain("Dr");
    expect(formatContactBalance(0, words)).not.toContain("Cr");
  });
  it("shows the size and the receivable word for a positive balance", () => {
    const text = formatContactBalance(1500, words);
    expect(text).toContain("1,500");
    expect(text.endsWith("Dr")).toBe(true);
  });
  it("shows the size without a minus sign and the payable word for a negative balance", () => {
    const text = formatContactBalance(-2500, words);
    expect(text).toContain("2,500");
    expect(text).not.toContain("-");
    expect(text.endsWith("Cr")).toBe(true);
  });
});
