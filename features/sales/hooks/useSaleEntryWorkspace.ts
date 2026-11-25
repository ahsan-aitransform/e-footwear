"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { RoundingModes, type RoundingMode } from "@/lib/constants/moneyFormat";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { calculateSaleTotals, splitPaymentsAfterChange, type PaymentEntryRow, type PaymentSplit, type SaleTotals } from "../logic/saleCalculations";
import { discardSalesDraft, loadSalesDraft, saveSalesDraft } from "../logic/saleEntryDraftStorage";
import {
  findSaleEntryProblems,
  saleEntryLinesReducer,
  toCalculationInput,
  type SaleEntryLine,
  type SaleEntryLinesAction,
  type SaleEntryProblem,
} from "../logic/saleEntryLines";
import type { SaleScreenConfiguration } from "../logic/saleScreenEndpoints";
import type { InvoiceBeingCorrected, PaymentRowState, SaleEntryDraft, SaleHeaderState, SalePrintChoices } from "../logic/saleEntryDraftTypes";
import {
  SalePaymentMethodCodes,
  SalePrintFormatCodes,
  SalePrintLanguageCodes,
  type SaleEntryContextResponse,
  type SalePaymentAccountResponse,
  type SalePaymentMethodCode,
  type SalePaymentRequest,
  type SalePosTerminalResponse,
  type SaleSalesmanLookupResponse,
} from "../types/saleTypes";

const DRAFT_SAVE_DELAY_MILLISECONDS = 400;
const NIL_STORE_ID = "00000000-0000-0000-0000-000000000000";

function createEmptyHeader(): SaleHeaderState {
  return {
    saleDate: todayAsIsoDate(),
    customer: null,
    salesmanStaffId: null,
    walkInCustomerName: "",
    walkInCustomerMobile: "",
    posTerminalDeviceId: null,
    description: "",
  };
}

export type { SaleHeaderState, PaymentRowState, SalePrintChoices };

export function createRowKey(): string {
  return createClientTransactionId();
}

// Everything the New Sale and Exchange screens share: the lines being typed, the header, the payments, the totals, the checks, the lookups, and the
// browser copy of the entry (Part 23). The screen itself only draws it and decides what "Save" sends.
export function useSaleEntryWorkspace(screen: SaleScreenConfiguration) {
  const session = useCurrentSession();
  const workingStoreId = useWorkingStoreId();
  const { stores } = useAccessibleStores();
  const storeId = workingStoreId ?? stores[0]?.id ?? "";

  const [lines, dispatchLines] = useReducer(saleEntryLinesReducer, [] as SaleEntryLine[]);
  const [header, setHeader] = useState<SaleHeaderState>(createEmptyHeader);
  const [paymentRows, setPaymentRows] = useState<PaymentRowState[]>([]);
  const [printOverrides, setPrintOverrides] = useState<Partial<SalePrintChoices>>({});
  const [clientTransactionId, setClientTransactionId] = useState(createClientTransactionId);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [wasDraftRestored, setWasDraftRestored] = useState(false);
  const [invoiceBeingCorrected, setInvoiceBeingCorrected] = useState<InvoiceBeingCorrected | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const entryContext = useApiQuery<SaleEntryContextResponse>(screen.entryContextPath, {
    query: { storeId, businessDate: header.saleDate },
    enabled: storeId !== "",
  });
  const paymentAccountsQuery = useApiQuery<SalePaymentAccountResponse[]>(screen.paymentAccountsPath, { enabled: storeId !== "" });
  const salesmenQuery = useApiQuery<SaleSalesmanLookupResponse[]>(screen.salesmenPath, { query: { storeId }, enabled: storeId !== "" });
  const posTerminalsQuery = useApiQuery<SalePosTerminalResponse[]>(screen.posTerminalsPath, { query: { storeId }, enabled: storeId !== "" });

  const roundingMode: RoundingMode = entryContext.data?.roundingModeCode ?? RoundingModes.floor;
  const defaults = entryContext.data?.printDefaults;
  const printChoices: SalePrintChoices = {
    formatCode: printOverrides.formatCode ?? defaults?.printFormatCode ?? SalePrintFormatCodes.thermal,
    languageCode: printOverrides.languageCode ?? defaults?.printLanguageCode ?? SalePrintLanguageCodes.english,
    includeGatePass: printOverrides.includeGatePass ?? false,
  };

  const totals: SaleTotals = useMemo(() => calculateSaleTotals(lines.map(toCalculationInput), roundingMode), [lines, roundingMode]);

  const paymentEntryRows: PaymentEntryRow[] = useMemo(
    () =>
      paymentRows
        .filter((row) => (row.receivedAmount ?? 0) > 0 && row.paymentAccountId !== "")
        .map((row) => ({
          paymentMethodCode: row.paymentMethodCode,
          paymentAccountId: row.paymentAccountId,
          receivedAmount: row.receivedAmount ?? 0,
          referenceNumber: row.referenceNumber.trim() === "" ? null : row.referenceNumber.trim(),
        })),
    [paymentRows],
  );

  // For an exchange the amount to collect is the new sale minus what is returned; the screen passes it as `amountDue`.
  const buildPaymentSplit = useCallback((amountDue: number): PaymentSplit => splitPaymentsAfterChange(paymentEntryRows, amountDue), [paymentEntryRows]);

  const findProblems = useCallback(
    (outstandingAmount: number): SaleEntryProblem[] =>
      findSaleEntryProblems(lines, {
        maximumManualDiscountPercentage: entryContext.data?.maximumManualDiscountPercentage ?? null,
        hasCustomer: header.customer !== null,
        outstandingAmount,
      }),
    [lines, entryContext.data?.maximumManualDiscountPercentage, header.customer],
  );

  const sessionCompanyId = session?.companyId ?? null;
  const sessionUserId = session?.userId ?? null;
  const draftIdentity = useMemo(
    () => (sessionCompanyId && sessionUserId && storeId ? { companyId: sessionCompanyId, userId: sessionUserId, storeId, screenCode: screen.screenCode } : null),
    [sessionCompanyId, sessionUserId, storeId, screen.screenCode],
  );

  // Restore what was typed before a reload or a lost connection. Runs once per person, store and screen.
  const restoredForIdentityKey = useRef<string | null>(null);
  useEffect(() => {
    if (!draftIdentity) return;
    const identityKey = `${draftIdentity.companyId}:${draftIdentity.userId}:${draftIdentity.storeId}:${draftIdentity.screenCode}`;
    if (restoredForIdentityKey.current === identityKey) return;
    restoredForIdentityKey.current = identityKey;
    void loadSalesDraft<SaleEntryDraft>(draftIdentity).then((draft) => {
      if (draft && draft.lines.length > 0) {
        dispatchLines({ type: "linesReplaced", lines: draft.lines });
        setHeader(draft.header);
        setPaymentRows(draft.paymentRows);
        setPrintOverrides(draft.printOverrides);
        setClientTransactionId(draft.clientTransactionId);
        setInvoiceBeingCorrected(draft.invoiceBeingCorrected ?? null);
        setVoidReason(draft.voidReason ?? "");
        setWasDraftRestored(true);
      }
      setIsDraftLoaded(true);
    });
  }, [draftIdentity]);

  const hasEntry = lines.length > 0;

  // Keep a copy of the entry in the browser while it is not saved. An empty entry removes the copy.
  useEffect(() => {
    if (!draftIdentity || !isDraftLoaded) return;
    const timer = window.setTimeout(() => {
      if (!hasEntry) void discardSalesDraft(draftIdentity);
      else void saveSalesDraft<SaleEntryDraft>(draftIdentity, { clientTransactionId, header, lines, paymentRows, printOverrides, invoiceBeingCorrected, voidReason });
    }, DRAFT_SAVE_DELAY_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [draftIdentity, isDraftLoaded, hasEntry, clientTransactionId, header, lines, paymentRows, printOverrides, invoiceBeingCorrected, voidReason]);

  // After the server confirmed the document: forget the entry and start the next one with a new client transaction id.
  const startNextEntry = useCallback(() => {
    dispatchLines({ type: "cleared" });
    setHeader((current) => ({ ...createEmptyHeader(), saleDate: current.saleDate }));
    setPaymentRows([]);
    setPrintOverrides((current) => ({ formatCode: current.formatCode, languageCode: current.languageCode }));
    setClientTransactionId(createClientTransactionId());
    setWasDraftRestored(false);
    setInvoiceBeingCorrected(null);
    setVoidReason("");
    if (draftIdentity) void discardSalesDraft(draftIdentity);
  }, [draftIdentity]);

  const updateHeader = useCallback((changes: Partial<SaleHeaderState>) => setHeader((current) => ({ ...current, ...changes })), []);
  const updatePrintChoices = useCallback((changes: Partial<SalePrintChoices>) => setPrintOverrides((current) => ({ ...current, ...changes })), []);

  const paymentAccounts = useMemo(() => paymentAccountsQuery.data ?? [], [paymentAccountsQuery.data]);
  const defaultAccountIdFor = useCallback(
    (methodCode: SalePaymentMethodCode): string => {
      const wantedKind = methodCode === SalePaymentMethodCodes.cash ? "CASH" : "BANK";
      const ofKind = paymentAccounts.filter((account) => account.kindCode === wantedKind);
      return (ofKind.find((account) => account.storeId === storeId) ?? ofKind.find((account) => account.storeId === NIL_STORE_ID) ?? ofKind[0])?.accountId ?? "";
    },
    [paymentAccounts, storeId],
  );

  const addPaymentRow = useCallback(
    (methodCode: SalePaymentMethodCode, receivedAmount: number | null) =>
      setPaymentRows((current) => [
        ...current,
        { rowKey: createRowKey(), paymentMethodCode: methodCode, paymentAccountId: defaultAccountIdFor(methodCode), receivedAmount, referenceNumber: "" },
      ]),
    [defaultAccountIdFor],
  );

  const toPaymentRequests = useCallback(
    (split: PaymentSplit): SalePaymentRequest[] =>
      split.keptRows.map((row) => ({
        paymentMethodCode: row.paymentMethodCode,
        paymentAccountId: row.paymentAccountId,
        amount: row.receivedAmount,
        referenceNumber: row.referenceNumber,
      })),
    [],
  );

  return {
    storeId,
    stores,
    entryContext,
    roundingMode,
    lines,
    dispatchLines: dispatchLines as (action: SaleEntryLinesAction) => void,
    header,
    updateHeader,
    paymentRows,
    setPaymentRows,
    addPaymentRow,
    paymentAccounts,
    salesmen: salesmenQuery.data ?? [],
    posTerminals: posTerminalsQuery.data ?? [],
    printChoices,
    updatePrintChoices,
    totals,
    buildPaymentSplit,
    findProblems,
    toPaymentRequests,
    clientTransactionId,
    // The entry exists only in this browser until the server confirms it: the screen shows this as a clear "not saved" state.
    hasUnsavedEntry: hasEntry,
    wasDraftRestored,
    invoiceBeingCorrected,
    voidReason,
    setVoidReason,
    startNextEntry,
  };
}

export type SaleEntryWorkspace = ReturnType<typeof useSaleEntryWorkspace>;
