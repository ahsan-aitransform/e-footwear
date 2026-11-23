"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { SEARCH_INPUT_DEBOUNCE_MILLISECONDS } from "@/lib/constants/paginationDefaults";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { SaleHeaderState } from "../hooks/useSaleEntryWorkspace";
import type { SaleScreenConfiguration } from "../logic/saleScreenEndpoints";
import type { SaleCustomerLookupResponse, SaleEntryContextResponse, SalePosTerminalResponse, SaleSalesmanLookupResponse } from "../types/saleTypes";

const MINIMUM_SEARCH_LENGTH = 2;

// Customer (docx 5.1): the default is a cash sale (no customer). Typing finds a customer; the balance is shown next to the name so the cashier sees
// what the customer already owes before putting more on credit. The balance and the credit limit are SHOWN only: whether a limit blocks a sale is
// [BUSINESS DECISION REQUIRED] and nothing is enforced here.
function SaleCustomerPicker({
  customersPath,
  customer,
  onCustomerChange,
}: {
  customersPath: string;
  customer: SaleCustomerLookupResponse | null;
  onCustomerChange: (customer: SaleCustomerLookupResponse | null) => void;
}) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [text, setText] = useState("");
  const [appliedText, setAppliedText] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedText(text.trim()), SEARCH_INPUT_DEBOUNCE_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [text]);

  const suggestions = useApiQuery<SaleCustomerLookupResponse[]>(customersPath, {
    query: { searchText: appliedText },
    enabled: customer === null && appliedText.length >= MINIMUM_SEARCH_LENGTH,
  });

  if (customer) {
    const balanceLabel =
      customer.balanceAmount > 0
        ? translateMessage("sales.header.customerOwes", { amount: formatWholeRupees(customer.balanceAmount) })
        : customer.balanceAmount < 0
          ? translateMessage("sales.header.customerHasCredit", { amount: formatWholeRupees(-customer.balanceAmount) })
          : translateMessage("sales.header.customerBalanceZero");
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm" data-testid="sale-selected-customer">
        <span>
          <span className="font-medium">{customer.name}</span> <span className="text-muted-foreground">({balanceLabel})</span>
        </span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("sales.header.clearCustomer")} onClick={() => onCustomerChange(null)}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          id="field-sale-customer"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={translateMessage("sales.header.cashSale")}
          autoComplete="off"
          aria-label={translateMessage("sales.header.customer")}
        />
        {hasPermission(PermissionCodes.PARTY.NEW_PARTY.ADD) && (
          <Link
            href={ApplicationRoutes.newParty}
            target="_blank"
            aria-label={translateMessage("sales.header.addCustomer")}
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <Plus />
          </Link>
        )}
      </div>
      {(suggestions.data ?? []).length > 0 && (
        <ul className="max-h-40 divide-y overflow-auto rounded-lg border" role="listbox" aria-label={translateMessage("sales.header.customerResults")}>
          {(suggestions.data ?? []).map((candidate) => (
            <li key={candidate.partyId}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                className="flex w-full justify-between gap-2 px-3 py-1.5 text-start text-sm hover:bg-muted focus-visible:bg-muted"
                onClick={() => {
                  onCustomerChange(candidate);
                  setText("");
                }}
              >
                <span>{candidate.name}</span>
                <span className="text-muted-foreground" dir="ltr">
                  {candidate.phoneNumber ?? candidate.code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The header of New Sale and Exchange: Date, Invoice #, Daily Bill #, Today Sale, Customer, Salesman, Mobile and Name of a walk-in customer, and the POS terminal.
export function SaleHeaderPanel({
  screen,
  header,
  onHeaderChange,
  entryContext,
  nextInvoiceNumber,
  salesmen,
  posTerminals,
}: {
  screen: SaleScreenConfiguration;
  header: SaleHeaderState;
  onHeaderChange: (changes: Partial<SaleHeaderState>) => void;
  entryContext: SaleEntryContextResponse | undefined;
  nextInvoiceNumber: number | undefined;
  salesmen: readonly SaleSalesmanLookupResponse[];
  posTerminals: readonly SalePosTerminalResponse[];
}) {
  const { translateMessage } = useTranslation();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden" data-testid="sale-header-panel">
      <DateField label={translateMessage("sales.header.date")} name="sale-date" value={header.saleDate} onValueChange={(saleDate) => onHeaderChange({ saleDate })} isRequired />
      <FormField label={translateMessage("sales.header.invoiceNumber")} name="sale-invoice-number">
        {(controlProps) => <Input {...controlProps} readOnly dir="ltr" value={nextInvoiceNumber === undefined ? "" : String(nextInvoiceNumber)} />}
      </FormField>
      <FormField label={translateMessage("sales.header.dailyBillNumber")} name="sale-daily-bill-number">
        {(controlProps) => <Input {...controlProps} readOnly dir="ltr" value={entryContext ? String(entryContext.nextDailyBillNumber) : ""} />}
      </FormField>
      <FormField label={translateMessage("sales.header.todaySale")} name="sale-today-sale">
        {(controlProps) => <Input {...controlProps} readOnly dir="ltr" value={entryContext ? formatWholeRupees(entryContext.todaySaleAmount) : ""} />}
      </FormField>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="field-sale-customer" className="text-sm font-medium">
          {translateMessage("sales.header.customer")}
        </label>
        <SaleCustomerPicker customersPath={screen.customersPath} customer={header.customer} onCustomerChange={(customer) => onHeaderChange({ customer })} />
      </div>
      <FormField label={translateMessage("sales.header.salesman")} name="sale-salesman">
        {(controlProps) => (
          <NativeSelect {...controlProps} value={header.salesmanPartyId ?? ""} onChange={(event) => onHeaderChange({ salesmanPartyId: event.target.value || null })}>
            <option value="">{translateMessage("sales.header.noSalesman")}</option>
            {salesmen.map((salesman) => (
              <option key={salesman.partyId} value={salesman.partyId}>
                {salesman.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      {posTerminals.length > 0 && (
        <FormField label={translateMessage("sales.header.posTerminal")} name="sale-pos-terminal">
          {(controlProps) => (
            <NativeSelect {...controlProps} value={header.posTerminalDeviceId ?? ""} onChange={(event) => onHeaderChange({ posTerminalDeviceId: event.target.value || null })}>
              <option value="">{translateMessage("sales.header.noPosTerminal")}</option>
              {posTerminals.map((terminal) => (
                <option key={terminal.deviceId} value={terminal.deviceId}>
                  {terminal.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
      {header.customer === null && (
        <>
          <TextInputField
            label={translateMessage("sales.header.walkInMobile")}
            name="sale-walk-in-mobile"
            value={header.walkInCustomerMobile}
            onChange={(event) => onHeaderChange({ walkInCustomerMobile: event.target.value })}
            dir="ltr"
          />
          <TextInputField
            label={translateMessage("sales.header.walkInName")}
            name="sale-walk-in-name"
            value={header.walkInCustomerName}
            onChange={(event) => onHeaderChange({ walkInCustomerName: event.target.value })}
          />
        </>
      )}
    </div>
  );
}
