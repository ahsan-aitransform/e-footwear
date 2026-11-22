"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { QuantityField } from "@/components/forms/QuantityField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { ProductRowActionsMenu } from "../components/ProductRowActionsMenu";
import { hasPriceBandFormErrors, validatePriceBandForm, type PriceBandFormErrors, type PriceBandFormValues } from "../logic/priceBandValidation";
import type { CreatedIdResponse, PriceBandResponse, SavePriceBandRequest } from "../types/catalogueTypes";

const emptyForm: PriceBandFormValues = { name: "", minimumPrice: null, maximumPrice: null, sortOrder: 0 };

// Price Bands: named price ranges ("Up to 1,000", "1,001 to 2,500", ...) used to group products by price. The list is small, so it is
// shown whole; a band is added or changed in a dialog. Changing a band checks its row version, so two people cannot overwrite each other.
export function PriceBandsPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const bands = useApiQuery<PriceBandResponse[]>(ApiEndpoints.priceBands.list);
  const mayAdd = hasPermission(PermissionCodes.PRODUCTS.PRICE_BANDS.ADD);
  const mayEdit = hasPermission(PermissionCodes.PRODUCTS.PRICE_BANDS.EDIT);
  const mayDelete = hasPermission(PermissionCodes.PRODUCTS.PRICE_BANDS.DELETE);

  const [editing, setEditing] = useState<PriceBandResponse | "new" | null>(null);
  const [values, setValues] = useState<PriceBandFormValues>(emptyForm);
  const [errors, setErrors] = useState<PriceBandFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string>();
  const [toDelete, setToDelete] = useState<PriceBandResponse | null>(null);
  const [pageMessage, setPageMessage] = useState<string>();

  function openDialog(band: PriceBandResponse | "new") {
    setEditing(band);
    setErrors({});
    setDialogMessage(undefined);
    setValues(band === "new" ? { ...emptyForm, sortOrder: (bands.data?.length ?? 0) * 10 + 10 } : { name: band.name, minimumPrice: band.minimumPrice, maximumPrice: band.maximumPrice, sortOrder: band.sortOrder });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePriceBandForm(values);
    setErrors(found);
    if (hasPriceBandFormErrors(found) || editing === null) return;
    const body: SavePriceBandRequest = {
      name: values.name.trim(),
      minimumPrice: values.minimumPrice ?? 0,
      maximumPrice: values.maximumPrice,
      sortOrder: values.sortOrder ?? 0,
      rowVersion: editing === "new" ? null : editing.rowVersion,
    };
    setIsSaving(true);
    const result =
      editing === "new"
        ? await apiRequest<CreatedIdResponse>(ApiEndpoints.priceBands.list, { method: "POST", body })
        : await apiRequest<void>(ApiEndpoints.priceBands.byId(editing.id), { method: "PUT", body });
    setIsSaving(false);
    if (!result.ok) return setDialogMessage(result.problem.message);
    showToast(translateMessage("catalogue.priceBands.toast.saved"), ToneNames.success);
    setEditing(null);
    bands.refetch();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await apiRequest<void>(ApiEndpoints.priceBands.byId(toDelete.id), { method: "DELETE" });
    if (!result.ok) setPageMessage(result.problem.message);
    else {
      setPageMessage(undefined);
      showToast(translateMessage("masterData.toast.deleted"), ToneNames.success);
      bands.refetch();
    }
    setToDelete(null);
  }

  const columns = useMemo<DataGridColumn<PriceBandResponse>[]>(
    () => [
      { key: "name", header: translateMessage("catalogue.priceBands.field.name"), render: (row) => row.name },
      { key: "minimumPrice", header: translateMessage("catalogue.priceBands.field.minimumPrice"), alignment: "end", render: (row) => formatWholeRupees(row.minimumPrice, { withSymbol: false }) },
      { key: "maximumPrice", header: translateMessage("catalogue.priceBands.field.maximumPrice"), alignment: "end", render: (row) => (row.maximumPrice === null ? translateMessage("catalogue.priceBands.noMaximum") : formatWholeRupees(row.maximumPrice, { withSymbol: false })) },
      { key: "sortOrder", header: translateMessage("catalogue.priceBands.field.sortOrder"), alignment: "end", isSecondary: true, render: (row) => row.sortOrder },
      {
        key: "actions",
        header: translateMessage("masterData.column.actions"),
        alignment: "end",
        render: (row) => (
          <div className="flex justify-end">
            <ProductRowActionsMenu onEdit={mayEdit ? () => openDialog(row) : undefined} onDelete={mayDelete ? () => setToDelete(row) : undefined} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateMessage, mayEdit, mayDelete],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("navigation.item.priceBands")}
        subtitle={translateMessage("catalogue.priceBands.subtitle")}
        actions={
          mayAdd && (
            <Button type="button" onClick={() => openDialog("new")}>
              <Plus />
              {translateMessage("catalogue.priceBands.add")}
            </Button>
          )
        }
      />
      <FormResultNotice errorMessage={pageMessage} />
      <SectionCard isPadded={false}>
        <DataGridTable
          rows={bands.data ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={translateMessage("navigation.item.priceBands")}
          isLoading={bands.status === "loading"}
          errorMessage={bands.status === "error" ? bands.problem?.message : undefined}
          emptyTitle={translateMessage("catalogue.priceBands.empty")}
          emptyText={translateMessage("catalogue.priceBands.emptyText")}
          onRowOpen={mayEdit ? (row) => openDialog(row) : undefined}
        />
      </SectionCard>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <form onSubmit={save} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{translateMessage(editing === "new" ? "catalogue.priceBands.addTitle" : "catalogue.priceBands.editTitle")}</DialogTitle>
              <DialogDescription>{translateMessage("catalogue.priceBands.dialogText")}</DialogDescription>
            </DialogHeader>
            <FormResultNotice errorMessage={dialogMessage} />
            <TextInputField label={translateMessage("catalogue.priceBands.field.name")} name="cataloguePriceBandName" required value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} errorMessage={errors.name ? translateMessage(errors.name) : undefined} />
            <div className="grid gap-4 sm:grid-cols-2">
              <WholeRupeeAmountField label={translateMessage("catalogue.priceBands.field.minimumPrice")} name="cataloguePriceBandMinimum" isRequired value={values.minimumPrice} onValueChange={(next) => setValues((current) => ({ ...current, minimumPrice: next }))} errorMessage={errors.minimumPrice ? translateMessage(errors.minimumPrice) : undefined} />
              <WholeRupeeAmountField label={translateMessage("catalogue.priceBands.field.maximumPrice")} name="cataloguePriceBandMaximum" hint={translateMessage("catalogue.priceBands.maximumHint")} value={values.maximumPrice} onValueChange={(next) => setValues((current) => ({ ...current, maximumPrice: next }))} errorMessage={errors.maximumPrice ? translateMessage(errors.maximumPrice) : undefined} />
            </div>
            <QuantityField label={translateMessage("catalogue.priceBands.field.sortOrder")} name="cataloguePriceBandSortOrder" isRequired value={values.sortOrder} onValueChange={(next) => setValues((current) => ({ ...current, sortOrder: next }))} errorMessage={errors.sortOrder ? translateMessage(errors.sortOrder) : undefined} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {translateMessage("common.cancel")}
              </Button>
              <SubmitButton label={translateMessage("common.save")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
