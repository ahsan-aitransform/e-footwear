// The keyboard of the sale screens (docx 5.1 to 5.3). F2 focuses the barcode box; Ctrl+S or F9 saves.
// DEVIATION from the docx: it asks for Ctrl+1 / Ctrl+2 / Ctrl+3 to open New Sale / Sale Return / Exchange Invoice, but browsers reserve Ctrl+1..9 for
// switching tabs and a web page cannot take them over. Alt+1 / Alt+2 / Alt+3 do the same job here.
export const SalesShortcutActions = {
  focusBarcode: "focusBarcode",
  save: "save",
  openNewSale: "openNewSale",
  openSaleReturn: "openSaleReturn",
  openExchangeInvoice: "openExchangeInvoice",
} as const;

export type SalesShortcutAction = (typeof SalesShortcutActions)[keyof typeof SalesShortcutActions];

export type KeyboardShortcutEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

export function interpretSalesShortcut(event: KeyboardShortcutEvent): SalesShortcutAction | null {
  if (event.key === "F2") return SalesShortcutActions.focusBarcode;
  if (event.key === "F9") return SalesShortcutActions.save;
  const hasOnlyControl = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
  if (hasOnlyControl && event.key.toLowerCase() === "s") return SalesShortcutActions.save;
  const hasOnlyAlt = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  if (hasOnlyAlt) {
    if (event.key === "1") return SalesShortcutActions.openNewSale;
    if (event.key === "2") return SalesShortcutActions.openSaleReturn;
    if (event.key === "3") return SalesShortcutActions.openExchangeInvoice;
  }
  return null;
}
