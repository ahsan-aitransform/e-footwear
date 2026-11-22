import { describe, expect, it } from "vitest";
import { formatPartyBalance } from "./partyBalanceFormatting";

const words = { receivable: "Dr", payable: "Cr" };

describe("formatPartyBalance", () => {
  it("shows the size and the side of a receivable and a payable", () => {
    expect(formatPartyBalance(1_250_000, words)).toMatch(/Dr$/);
    expect(formatPartyBalance(-500, words)).toMatch(/500.*Cr$/);
    expect(formatPartyBalance(-500, words)).not.toContain("-");
  });

  it("shows plain zero without a side", () => {
    expect(formatPartyBalance(0, words)).not.toMatch(/Dr|Cr/);
  });
});
