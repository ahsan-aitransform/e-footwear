"use client";

import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { buildCode128Bars } from "../logic/code128";
import type { BarcodeLabelLayout } from "../logic/barcodeLabelLayouts";
import type { BarcodeLabelResponse } from "../types/catalogueTypes";
import styles from "./barcodeLabelSheet.module.css";

const BARCODE_HEIGHT_UNITS = 30;

// The bars of one barcode as an SVG (Code 128, drawn from the encoder in logic/code128.ts, so no font or library is needed).
// An SVG prints sharply at any label size.
function BarcodeBars({ barcode }: { barcode: string }) {
  let drawing: ReturnType<typeof buildCode128Bars>;
  try {
    drawing = buildCode128Bars(barcode);
  } catch {
    return null;
  }
  return (
    <svg className={styles.barcode} viewBox={`0 0 ${drawing.totalModules} ${BARCODE_HEIGHT_UNITS}`} preserveAspectRatio="none" role="img" aria-label={barcode}>
      {drawing.bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={BARCODE_HEIGHT_UNITS} fill="currentColor" />
      ))}
    </svg>
  );
}

// The labels as they will be printed: one box per label with the product name, size, price and the barcode with its number.
// The surrounding page hides everything else when printing (print:hidden on the other blocks).
export function BarcodeLabelSheet({
  labels,
  layout,
  showName,
  showPrice,
}: {
  labels: readonly BarcodeLabelResponse[];
  layout: BarcodeLabelLayout;
  showName: boolean;
  showPrice: boolean;
}) {
  return (
    <div className={styles.sheet}>
      {labels.map((label, index) => (
        <div key={`${label.variantId}-${index}`} className={`${styles.label} bg-card text-card-foreground`} style={{ width: `${layout.widthMillimetres}mm`, height: `${layout.heightMillimetres}mm` }}>
          <div className="flex items-baseline justify-between gap-1 text-[8pt] font-semibold">
            {showName ? <span className="truncate">{label.productName}</span> : <span>{label.productCode}</span>}
            <span className="shrink-0">{label.sizeCode}</span>
          </div>
          <BarcodeBars barcode={label.barcode} />
          <div className="flex items-baseline justify-between gap-1 text-[7pt]">
            <span dir="ltr" className="tabular-nums">{label.barcode}</span>
            {showPrice && <span className="shrink-0 font-semibold">{formatWholeRupees(label.salePrice)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
