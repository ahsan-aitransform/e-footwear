"use client";

import { ScanBarcode } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/useTranslation";

// The scan field of the audit, the sending and the receiving screens: a scanner types the barcode and presses Enter, which counts the pieces. The quantity is for
// a pile of the same size (1 by default). The parent sends the scan and answers true when it was counted, which clears the field and keeps the focus here so
// the next scan can follow at once.
export function BarcodeScanBox({
  onScan,
  maximumQuantity,
  minimumQuantity = 1,
  isDisabled = false,
}: {
  onScan: (barcode: string, quantity: number) => Promise<boolean>;
  maximumQuantity: number;
  // A negative minimum allows a correction (the audit takes minus pieces back).
  minimumQuantity?: number;
  isDisabled?: boolean;
}) {
  const { translateMessage } = useTranslation();
  const barcodeReference = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [quantityText, setQuantityText] = useState("1");
  const [isBusy, setIsBusy] = useState(false);
  const quantity = Number(quantityText);
  const isQuantityValid = Number.isInteger(quantity) && quantity !== 0 && quantity >= minimumQuantity && quantity <= maximumQuantity;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (barcode.trim() === "" || !isQuantityValid) return;
    setIsBusy(true);
    const wasCounted = await onScan(barcode.trim(), quantity);
    setIsBusy(false);
    if (wasCounted) {
      setBarcode("");
      setQuantityText("1");
    }
    barcodeReference.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor="scan-barcode">{translateMessage("inventory.scan.barcode")}</Label>
        <Input
          id="scan-barcode"
          ref={barcodeReference}
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          autoFocus
          autoComplete="off"
          dir="ltr"
          disabled={isDisabled || isBusy}
        />
      </div>
      <div className="w-28 space-y-1.5">
        <Label htmlFor="scan-quantity">{translateMessage("inventory.scan.quantity")}</Label>
        <Input
          id="scan-quantity"
          type="number"
          inputMode="numeric"
          min={minimumQuantity}
          max={maximumQuantity}
          value={quantityText}
          onChange={(event) => setQuantityText(event.target.value)}
          aria-invalid={isQuantityValid ? undefined : true}
          dir="ltr"
          disabled={isDisabled || isBusy}
        />
      </div>
      <Button type="submit" disabled={isDisabled || isBusy || barcode.trim() === "" || !isQuantityValid}>
        <ScanBarcode />
        {translateMessage("inventory.scan.count")}
      </Button>
    </form>
  );
}
