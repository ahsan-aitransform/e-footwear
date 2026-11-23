"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { PaymentRowState } from "../hooks/useSaleEntryWorkspace";
import type { PaymentSplit } from "../logic/saleCalculations";
import {
  SalePaymentMethodCodes,
  type SalePaymentAccountResponse,
  type SalePaymentMethodCode,
  type SalePaymentMethodResponse,
} from "../types/saleTypes";

function Figure({ label, amount, isStrong = false }: { label: string; amount: number; isStrong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={isStrong ? "text-lg font-semibold tabular-nums" : "text-sm tabular-nums"} dir="ltr">
        {formatWholeRupees(amount)}
      </dd>
    </div>
  );
}

// Payment (docx 5.1: Paid Amount, Payment account, Cash Received, Cash Return). Every row is one payment the customer made: the method, the cash or bank
// account it goes into, and the amount handed over. The change is worked out from the cash handed over and is given back out of the cash rows. An amount
// short of the bill is put on the account of the customer (a customer has to be chosen).
export function SalePaymentPanel({
  paymentRows,
  onPaymentRowsChange,
  onAddPaymentRow,
  paymentAccounts,
  enabledMethods,
  amountDue,
  split,
  isDisabled = false,
}: {
  paymentRows: readonly PaymentRowState[];
  onPaymentRowsChange: (rows: PaymentRowState[]) => void;
  onAddPaymentRow: (methodCode: SalePaymentMethodCode, receivedAmount: number | null) => void;
  paymentAccounts: readonly SalePaymentAccountResponse[];
  enabledMethods: readonly SalePaymentMethodResponse[];
  // What the customer has to pay now: the net bill (New Sale) or the difference (Exchange).
  amountDue: number;
  split: PaymentSplit;
  isDisabled?: boolean;
}) {
  const { translateMessage, languageCode } = useTranslation();
  const methods = enabledMethods.length > 0 ? enabledMethods : [{ code: SalePaymentMethodCodes.cash, displayNameEnglish: "Cash", displayNameUrdu: null }];

  function updateRow(rowKey: string, changes: Partial<PaymentRowState>) {
    onPaymentRowsChange(paymentRows.map((row) => (row.rowKey === rowKey ? { ...row, ...changes } : row)));
  }

  function accountsFor(methodCode: SalePaymentMethodCode) {
    const wantedKind = methodCode === SalePaymentMethodCodes.cash ? "CASH" : "BANK";
    return paymentAccounts.filter((account) => account.kindCode === wantedKind);
  }

  return (
    <div className="space-y-3" data-testid="sale-payment-panel">
      {paymentRows.map((row, rowIndex) => (
        <div key={row.rowKey} className="grid grid-cols-2 items-end gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <FormField label={translateMessage("sales.payment.method")} name={`sale-payment-method-${rowIndex}`}>
            {(controlProps) => (
              <NativeSelect
                {...controlProps}
                value={row.paymentMethodCode}
                disabled={isDisabled}
                onChange={(event) => {
                  const methodCode = event.target.value as SalePaymentMethodCode;
                  const firstAccount = accountsFor(methodCode)[0];
                  updateRow(row.rowKey, { paymentMethodCode: methodCode, paymentAccountId: firstAccount?.accountId ?? "" });
                }}
              >
                {methods.map((method) => (
                  <option key={method.code} value={method.code}>
                    {languageCode === "ur" && method.displayNameUrdu ? method.displayNameUrdu : method.displayNameEnglish}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField label={translateMessage("sales.payment.account")} name={`sale-payment-account-${rowIndex}`}>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={row.paymentAccountId} disabled={isDisabled} onChange={(event) => updateRow(row.rowKey, { paymentAccountId: event.target.value })}>
                {accountsFor(row.paymentMethodCode).map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.title}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <WholeRupeeAmountField
            label={row.paymentMethodCode === SalePaymentMethodCodes.cash ? translateMessage("sales.payment.cashReceived") : translateMessage("sales.payment.amountReceived")}
            name={`sale-payment-amount-${rowIndex}`}
            value={row.receivedAmount}
            isDisabled={isDisabled}
            onValueChange={(receivedAmount) => updateRow(row.rowKey, { receivedAmount })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isDisabled}
            aria-label={translateMessage("sales.payment.removeRow")}
            onClick={() => onPaymentRowsChange(paymentRows.filter((other) => other.rowKey !== row.rowKey))}
          >
            <Trash2 />
          </Button>
          {row.paymentMethodCode !== SalePaymentMethodCodes.cash && (
            <div className="col-span-full">
              <Input
                aria-label={translateMessage("sales.payment.reference")}
                placeholder={translateMessage("sales.payment.reference")}
                value={row.referenceNumber}
                disabled={isDisabled}
                dir="ltr"
                onChange={(event) => updateRow(row.rowKey, { referenceNumber: event.target.value })}
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={isDisabled || amountDue <= 0} onClick={() => onAddPaymentRow(SalePaymentMethodCodes.cash, amountDue)}>
          {translateMessage("sales.payment.payInFullCash")}
        </Button>
        <Button type="button" variant="outline" disabled={isDisabled} onClick={() => onAddPaymentRow(SalePaymentMethodCodes.cash, null)}>
          <Plus />
          {translateMessage("sales.payment.addRow")}
        </Button>
      </div>

      <dl className="space-y-1 rounded-lg bg-muted/50 p-3">
        <Figure label={translateMessage("sales.payment.paidAmount")} amount={split.keptAmount} />
        <Figure label={translateMessage("sales.payment.cashReceivedTotal")} amount={split.receivedAmount} />
        <Figure label={translateMessage("sales.payment.cashReturn")} amount={split.changeAmount} isStrong />
        <Figure label={translateMessage("sales.payment.balance")} amount={split.outstandingAmount} />
      </dl>
      {!split.isChangeCoveredByCash && <InlineNotice tone={ToneNames.danger}>{translateMessage("sales.payment.changeNeedsCash")}</InlineNotice>}
    </div>
  );
}
