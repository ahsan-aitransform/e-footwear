// What the Sale Return and Exchange screens know about the goods coming back. A return always names the sale line it brings back (docx 5.2 designed with
// the link to the original invoice, Part 12): the quantity can never be more than what is still returnable, which the server checks again for the whole
// request, including the same line named twice and returns already posted.
import type { RoundingMode } from "@/lib/constants/moneyFormat";
import { sumWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { calculateReturnedLineAmount } from "./saleCalculations";
import {
  ReturnedItemConditionCodes,
  type ReturnableInvoiceResponse,
  type ReturnableSaleLineResponse,
  type ReturnedItemConditionCode,
  type ReturnedLineRequest,
} from "../types/saleTypes";

export type ReturnSelection = {
  quantity: number | null;
  reasonText: string;
  itemConditionCode: ReturnedItemConditionCode;
};

export type ReturnSelections = Record<string, ReturnSelection>;

export const emptyReturnSelection: ReturnSelection = { quantity: null, reasonText: "", itemConditionCode: ReturnedItemConditionCodes.sellable };

export function allReturnableLines(invoices: readonly ReturnableInvoiceResponse[]): ReturnableSaleLineResponse[] {
  return invoices.flatMap((invoice) => invoice.lines);
}

// Only lines with a quantity above zero are part of the return.
export function chosenReturnLines(invoices: readonly ReturnableInvoiceResponse[], selections: ReturnSelections) {
  return allReturnableLines(invoices)
    .map((line) => ({ line, selection: selections[line.lineId] ?? emptyReturnSelection }))
    .filter(({ selection }) => (selection.quantity ?? 0) > 0);
}

export type ReturnProblemKey = "sales.return.problem.nothingChosen" | "sales.return.problem.moreThanReturnable";

export function findReturnProblems(invoices: readonly ReturnableInvoiceResponse[], selections: ReturnSelections): { messageKey: ReturnProblemKey; lineId?: string }[] {
  const chosen = chosenReturnLines(invoices, selections);
  if (chosen.length === 0) return [{ messageKey: "sales.return.problem.nothingChosen" }];
  return chosen
    .filter(({ line, selection }) => (selection.quantity ?? 0) > line.returnableQuantity)
    .map(({ line }) => ({ messageKey: "sales.return.problem.moreThanReturnable" as const, lineId: line.lineId }));
}

// The value of what comes back: the price the customer paid per unit x the quantity, line by line.
export function calculateReturnTotal(invoices: readonly ReturnableInvoiceResponse[], selections: ReturnSelections, roundingMode: RoundingMode): number {
  return sumWholeRupees(chosenReturnLines(invoices, selections).map(({ line, selection }) => calculateReturnedLineAmount(line.unitPrice, selection.quantity ?? 0, roundingMode)));
}

export function toReturnedLineRequests(invoices: readonly ReturnableInvoiceResponse[], selections: ReturnSelections): ReturnedLineRequest[] {
  return chosenReturnLines(invoices, selections).map(({ line, selection }) => ({
    originalLineId: line.lineId,
    quantity: selection.quantity ?? 0,
    reasonText: selection.reasonText.trim() === "" ? null : selection.reasonText.trim(),
    itemConditionCode: selection.itemConditionCode,
  }));
}

// Finding the same invoice twice must not list its lines twice.
export function addReturnableInvoice(invoices: readonly ReturnableInvoiceResponse[], found: ReturnableInvoiceResponse): ReturnableInvoiceResponse[] {
  return [...invoices.filter((invoice) => invoice.invoiceId !== found.invoiceId), found];
}
