"use client";

import { useMemo, useState, type FormEvent } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { PercentageField } from "@/components/forms/PercentageField";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { parsePercentageInput } from "@/lib/money/quantityAndPercentage";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import { formatPromotionMoment } from "../logic/promotionDateTime";
import { isValidDiscountPercentage } from "../logic/promotionFormValidation";
import type {
  AddSpecialOfferLinesRequest,
  AddSpecialOfferLinesResponse,
  MasterOptionResponse,
  PromotionRuleResponse,
  SpecialOfferLineResponse,
  UpdateSpecialOfferLineRequest,
} from "../types/promotionTypes";

// Special Offer Details (docx 2.14): pick an offer, then scan barcodes (or add a whole category or company) with a discount percentage. Each line's percentage can be changed
// and saved, and a line can be removed. A size is in an offer once. Every change runs the pricing engine on the server, so a running offer shows its prices at once.
export function SpecialOfferDetailsPage() {
  const { translateMessage, languageCode } = useTranslation();
  const [offerId, setOfferId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [percentage, setPercentage] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [message, setMessage] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  const offers = useApiQuery<PromotionRuleResponse[]>(ApiEndpoints.promotions.specialOffers, { offlineCacheName: "promotion-special-offers" });
  const categories = useApiQuery<MasterOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.categories));
  const brands = useApiQuery<MasterOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.brands));
  const lines = useApiQuery<SpecialOfferLineResponse[]>(offerId === "" ? null : ApiEndpoints.promotions.specialOfferLines(offerId), { enabled: offerId !== "" });

  const selectedOffer = (offers.data ?? []).find((offer) => offer.id === offerId);
  const offerOptions: OptionSelectOption[] = (offers.data ?? []).map((offer) => ({ value: offer.id, label: offer.name }));
  const categoryOptions: OptionSelectOption[] = (categories.data ?? []).map((category) => ({ value: category.id, label: category.name }));
  const brandOptions: OptionSelectOption[] = (brands.data ?? []).map((brand) => ({ value: brand.id, label: brand.name }));
  const canAdd = requireAnyPermission(PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.ADD);
  const canEdit = requireAnyPermission(PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.EDIT);
  const canDelete = requireAnyPermission(PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.DELETE);

  // True when the products were added, so the barcode box is emptied only then and a failed add keeps what the person typed.
  async function addLines(request: AddSpecialOfferLinesRequest): Promise<boolean> {
    if (!isValidDiscountPercentage(request.discountPercent)) {
      setMessage(translateMessage("promotions.offerDetails.error.percentage"));
      return false;
    }
    setMessage(undefined);
    setIsBusy(true);
    const result = await apiRequest<AddSpecialOfferLinesResponse>(ApiEndpoints.promotions.specialOfferLines(offerId), { method: "POST", body: request });
    setIsBusy(false);
    if (!result.ok) {
      setMessage(result.problem.message);
      return false;
    }
    showToast(translateMessage("promotions.offerDetails.toast.added", { added: result.data.addedCount, skipped: result.data.skippedCount }), ToneNames.success);
    lines.refetch();
    offers.refetch();
    return true;
  }

  function handleAddBarcode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (barcode.trim() === "") return setMessage(translateMessage("promotions.offerDetails.error.barcode"));
    void addLines({ barcode: barcode.trim(), categoryId: null, brandId: null, discountPercent: percentage }).then((isAdded) => { if (isAdded) setBarcode(""); });
  }

  async function saveLine(line: SpecialOfferLineResponse, discountPercent: number | null) {
    if (!isValidDiscountPercentage(discountPercent)) return setMessage(translateMessage("promotions.offerDetails.error.percentage"));
    setMessage(undefined);
    const body: UpdateSpecialOfferLineRequest = { discountPercent };
    const result = await apiRequest<void>(ApiEndpoints.promotions.specialOfferLineById(offerId, line.lineId), { method: "PUT", body });
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("promotions.offerDetails.toast.saved"), ToneNames.success);
    lines.refetch();
  }

  async function removeLine(line: SpecialOfferLineResponse) {
    setMessage(undefined);
    const result = await apiRequest<void>(ApiEndpoints.promotions.specialOfferLineById(offerId, line.lineId), { method: "DELETE" });
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("promotions.offerDetails.toast.removed"), ToneNames.success);
    lines.refetch();
    offers.refetch();
  }

  const columns = useMemo<DataGridColumn<SpecialOfferLineResponse>[]>(
    () => [
      { key: "barcode", header: translateMessage("promotions.offerDetails.column.barcode"), render: (line) => <span dir="ltr">{line.barcode}</span> },
      { key: "productName", header: translateMessage("promotions.offerDetails.column.product"), render: (line) => `${line.productName} (${line.productCode})` },
      { key: "sizeCode", header: translateMessage("promotions.offerDetails.column.size"), render: (line) => <span dir="ltr">{line.sizeCode}</span> },
      { key: "colorName", header: translateMessage("promotions.offerDetails.column.color"), isSecondary: true, render: (line) => line.colorName ?? "" },
      { key: "categoryName", header: translateMessage("promotions.offerDetails.column.category"), isSecondary: true, render: (line) => line.categoryName },
      { key: "genderName", header: translateMessage("promotions.offerDetails.column.gender"), isSecondary: true, render: (line) => line.genderName ?? "" },
      { key: "seasonName", header: translateMessage("promotions.offerDetails.column.season"), isSecondary: true, render: (line) => line.seasonName ?? "" },
      { key: "brandName", header: translateMessage("promotions.offerDetails.column.company"), isSecondary: true, render: (line) => line.brandName ?? "" },
      {
        key: "discountPercent",
        header: translateMessage("promotions.offerDetails.column.percentage"),
        alignment: "end",
        render: (line) => (
          <PermissionGate requirement={canEdit} fallback={<span dir="ltr">{line.discountPercent}%</span>}>
            <EditableLinePercentage line={line} saveLabel={translateMessage("promotions.offerDetails.save")} onSave={(discountPercent) => saveLine(line, discountPercent)} />
          </PermissionGate>
        ),
      },
      {
        key: "actions",
        header: translateMessage("promotions.offerDetails.column.actions"),
        alignment: "end",
        render: (line) => (
          <PermissionGate requirement={canDelete}>
            <Button type="button" size="sm" variant="destructive" onClick={() => void removeLine(line)}>
              {translateMessage("promotions.offerDetails.remove")}
            </Button>
          </PermissionGate>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateMessage, offerId],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("promotions.offerDetails.title")} subtitle={translateMessage("promotions.offerDetails.subtitle")} />
      <SectionCard>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <FormField label={translateMessage("promotions.offerDetails.offer")} name="offerDetailsOffer">
            {(controlProps) => <OptionSelect {...controlProps} options={offerOptions} value={offerId} onValueChange={setOfferId} emptyOptionLabel={translateMessage("promotions.offerDetails.offerPlaceholder")} />}
          </FormField>
          {selectedOffer && (
            <p className="pb-2 text-sm text-muted-foreground" dir="ltr">
              {translateMessage("promotions.offerDetails.period", {
                from: formatPromotionMoment(selectedOffer.startsAt, languageCode),
                to: selectedOffer.endsAt ? formatPromotionMoment(selectedOffer.endsAt, languageCode) : translateMessage("promotions.common.noEnd"),
              })}
            </p>
          )}
        </div>
        {offers.status === "success" && (offers.data ?? []).length === 0 && <InlineNotice>{translateMessage("promotions.offerDetails.noOffers")}</InlineNotice>}
      </SectionCard>

      {offerId !== "" && (
        <>
          <PermissionGate requirement={canAdd}>
            <SectionCard>
              <FormResultNotice errorMessage={message} />
              <form onSubmit={handleAddBarcode} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
                <TextInputField label={translateMessage("promotions.offerDetails.barcode")} name="offerDetailsBarcode" autoComplete="off" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
                <PercentageField label={translateMessage("promotions.offerDetails.percentage")} name="offerDetailsPercentage" value={percentage} onValueChange={setPercentage} />
                <Button type="submit" disabled={isBusy}>
                  {translateMessage("promotions.offerDetails.addProduct")}
                </Button>
              </form>
              <div className="mt-4 grid items-end gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label={translateMessage("promotions.offerDetails.category")} name="offerDetailsCategory">
                  {(controlProps) => <OptionSelect {...controlProps} options={categoryOptions} value={categoryId} onValueChange={setCategoryId} emptyOptionLabel="-" />}
                </FormField>
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => (categoryId === "" ? setMessage(translateMessage("promotions.offerDetails.chooseOne")) : void addLines({ barcode: null, categoryId, brandId: null, discountPercent: percentage }))}>
                  {translateMessage("promotions.offerDetails.addCategory")}
                </Button>
                <FormField label={translateMessage("promotions.offerDetails.company")} name="offerDetailsCompany">
                  {(controlProps) => <OptionSelect {...controlProps} options={brandOptions} value={brandId} onValueChange={setBrandId} emptyOptionLabel="-" />}
                </FormField>
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => (brandId === "" ? setMessage(translateMessage("promotions.offerDetails.chooseOne")) : void addLines({ barcode: null, categoryId: null, brandId, discountPercent: percentage }))}>
                  {translateMessage("promotions.offerDetails.addCompany")}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{translateMessage("promotions.offerDetails.bulkHint")}</p>
            </SectionCard>
          </PermissionGate>

          <SectionCard isPadded={false}>
            <DataGridTable
              rows={lines.data ?? []}
              columns={columns}
              getRowKey={(line) => line.lineId}
              caption={translateMessage("promotions.offerDetails.title")}
              isLoading={lines.status === "loading"}
              errorMessage={lines.status === "error" ? (lines.problem?.message ?? translateMessage("promotions.offerDetails.loadFailed")) : undefined}
              emptyTitle={translateMessage("promotions.offerDetails.empty")}
              emptyText={translateMessage("promotions.offerDetails.emptyText")}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}

// The percentage cell of a line: an input and a Save button that is enabled only when the number was changed.
function EditableLinePercentage({ line, saveLabel, onSave }: { line: SpecialOfferLineResponse; saveLabel: string; onSave: (discountPercent: number | null) => void }) {
  const [text, setText] = useState(String(line.discountPercent));
  const parsed = parsePercentageInput(text);
  const isChanged = parsed !== line.discountPercent;
  return (
    <div className="flex items-center justify-end gap-2">
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        inputMode="decimal"
        dir="ltr"
        className="w-24 text-end"
        aria-label={`${line.barcode} %`}
      />
      <Button type="button" size="sm" variant="outline" disabled={!isChanged || parsed === null} onClick={() => onSave(parsed)}>
        {saveLabel}
      </Button>
    </div>
  );
}
