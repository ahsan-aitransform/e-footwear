import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/apiRequest";
import { BarcodeScanBox } from "./BarcodeScanBox";

vi.mock("@/lib/api/apiRequest", () => ({ apiRequest: vi.fn() }));

describe("BarcodeScanBox", () => {
  it("offers the sizes when a product code was typed, and counts the chosen one", async () => {
    const size = { variantId: "v1", productCode: "7", productName: "Sandal", barcode: "7S40", sizeCode: "40", colorName: null };
    vi.mocked(apiRequest).mockResolvedValue({ ok: true, status: 200, data: [size] });
    const onScan = vi.fn(async (barcode: string) => barcode === "7S40");
    const user = userEvent.setup();
    render(<BarcodeScanBox onScan={onScan} maximumQuantity={10} />);

    await user.type(screen.getByRole("textbox"), "7{Enter}");
    await user.click(await screen.findByRole("button", { name: "40" }));

    expect(onScan).toHaveBeenLastCalledWith("7S40", 1);
    expect(screen.queryByRole("button", { name: "40" })).not.toBeInTheDocument();
  });
});
