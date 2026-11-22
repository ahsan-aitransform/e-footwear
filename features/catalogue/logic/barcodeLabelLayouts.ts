import type { BarcodeLabelResponse } from "../types/catalogueTypes";
import { CatalogueLimits } from "./catalogueLimits";

// The label sizes the Generate Bar Codes page offers, in millimetres (the common roll and sheet label sizes of a shoe shop).
export const BarcodeLabelLayouts = [
  { code: "50x25", widthMillimetres: 50, heightMillimetres: 25 },
  { code: "40x30", widthMillimetres: 40, heightMillimetres: 30 },
  { code: "38x25", widthMillimetres: 38, heightMillimetres: 25 },
  { code: "60x40", widthMillimetres: 60, heightMillimetres: 40 },
] as const;

export type BarcodeLabelLayout = (typeof BarcodeLabelLayouts)[number];
export const DEFAULT_BARCODE_LABEL_LAYOUT_CODE = BarcodeLabelLayouts[0].code;

export function findBarcodeLabelLayout(code: string): BarcodeLabelLayout {
  return BarcodeLabelLayouts.find((layout) => layout.code === code) ?? BarcodeLabelLayouts[0];
}

// One printed label per copy: a size asked for 3 times becomes three labels, in the order the sizes were chosen.
export function expandLabelCopies(labels: readonly BarcodeLabelResponse[]): BarcodeLabelResponse[] {
  return labels.flatMap((label) => Array.from({ length: label.copies }, () => label));
}

export type LabelRequestProblem = "noSizes" | "tooManySizes" | "copiesOutOfRange" | "tooManyLabels";

// The checks the server makes on a label request (BarcodeService), so the person is told before sending it.
export function checkLabelRequest(items: readonly { copies: number | null }[]): LabelRequestProblem | null {
  if (items.length === 0) return "noSizes";
  if (items.length > CatalogueLimits.maximumLabelKinds) return "tooManySizes";
  if (items.some((item) => item.copies === null || !Number.isInteger(item.copies) || item.copies < 1 || item.copies > CatalogueLimits.maximumLabelCopiesPerSize))
    return "copiesOutOfRange";
  const total = items.reduce((sum, item) => sum + (item.copies ?? 0), 0);
  return total > CatalogueLimits.maximumLabelsPerRequest ? "tooManyLabels" : null;
}
