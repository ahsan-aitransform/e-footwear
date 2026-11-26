"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import { PromotionPhaseBadge } from "../components/PromotionPhaseBadge";
import { PromotionRuleDialog } from "../components/PromotionRuleDialog";
import { formatPromotionMoment } from "../logic/promotionDateTime";
import { PromotionKindCodes, type PromotionKindCode, type PromotionRuleResponse } from "../types/promotionTypes";

type KindConfiguration = {
  kindCode: PromotionKindCode;
  listEndpoint: string;
  endpointOfRule: (ruleId: string) => string;
  offlineCacheName: string;
  titleKey: MessageKey;
  subtitleKey: MessageKey;
  newKey: MessageKey;
  listTitleKey: MessageKey;
  emptyKey: MessageKey;
  emptyTextKey: MessageKey;
  permissions: { add: string; edit: string; delete: string };
};

const specialOfferPermissions = PermissionCodes.SETTINGS.SPECIAL_OFFERS;
const saleOnStoresPermissions = PermissionCodes.SETTINGS.SALE_ON_STORES;
const saleOnCategoriesPermissions = PermissionCodes.SETTINGS.SALE_ON_CATEGORIES;

const kindConfigurations: Record<PromotionKindCode, KindConfiguration> = {
  [PromotionKindCodes.specialOffer]: {
    kindCode: PromotionKindCodes.specialOffer,
    listEndpoint: ApiEndpoints.promotions.specialOffers,
    endpointOfRule: ApiEndpoints.promotions.specialOfferById,
    offlineCacheName: "promotion-special-offers",
    titleKey: "promotions.specialOffers.title",
    subtitleKey: "promotions.specialOffers.subtitle",
    newKey: "promotions.specialOffers.new",
    listTitleKey: "promotions.specialOffers.listTitle",
    emptyKey: "promotions.specialOffers.empty",
    emptyTextKey: "promotions.specialOffers.emptyText",
    permissions: { add: specialOfferPermissions.ADD, edit: specialOfferPermissions.EDIT, delete: specialOfferPermissions.DELETE },
  },
  [PromotionKindCodes.saleOnStores]: {
    kindCode: PromotionKindCodes.saleOnStores,
    listEndpoint: ApiEndpoints.promotions.salesOnStores,
    endpointOfRule: ApiEndpoints.promotions.saleOnStoresById,
    offlineCacheName: "promotion-sales-on-stores",
    titleKey: "promotions.saleOnStores.title",
    subtitleKey: "promotions.saleOnStores.subtitle",
    newKey: "promotions.saleOnStores.new",
    listTitleKey: "promotions.saleOnStores.listTitle",
    emptyKey: "promotions.saleOnStores.empty",
    emptyTextKey: "promotions.saleOnStores.emptyText",
    permissions: { add: saleOnStoresPermissions.ADD, edit: saleOnStoresPermissions.EDIT, delete: saleOnStoresPermissions.DELETE },
  },
  [PromotionKindCodes.saleOnCategories]: {
    kindCode: PromotionKindCodes.saleOnCategories,
    listEndpoint: ApiEndpoints.promotions.salesOnCategories,
    endpointOfRule: ApiEndpoints.promotions.saleOnCategoriesById,
    offlineCacheName: "promotion-sales-on-categories",
    titleKey: "promotions.saleOnCategories.title",
    subtitleKey: "promotions.saleOnCategories.subtitle",
    newKey: "promotions.saleOnCategories.new",
    listTitleKey: "promotions.saleOnCategories.listTitle",
    emptyKey: "promotions.saleOnCategories.empty",
    emptyTextKey: "promotions.saleOnCategories.emptyText",
    permissions: { add: saleOnCategoriesPermissions.ADD, edit: saleOnCategoriesPermissions.EDIT, delete: saleOnCategoriesPermissions.DELETE },
  },
};

type DialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; ruleId: string };

// The list screen of a special offer, a sale on stores or a sale on categories (docx 2.13, 2.15, 2.16): the promotions of that kind with their dates, status and
// scope, New, Edit and Delete. Editing loads the full rule (stores and categories). "Apply schedule now" runs the pricing engine, because a promotion that starts or
// ends at a given minute changes the prices only when the engine runs.
export function PromotionRulesPage({ kindCode }: { kindCode: PromotionKindCode }) {
  const configuration = kindConfigurations[kindCode];
  const { translateMessage, languageCode } = useTranslation();
  const rules = useApiQuery<PromotionRuleResponse[]>(configuration.listEndpoint, { offlineCacheName: configuration.offlineCacheName });
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [ruleToDelete, setRuleToDelete] = useState<PromotionRuleResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const detailRuleId = dialog.kind === "edit" ? dialog.ruleId : "";
  const detail = useApiQuery<PromotionRuleResponse>(detailRuleId === "" ? null : configuration.endpointOfRule(detailRuleId), { enabled: detailRuleId !== "" });

  const isOffer = kindCode === PromotionKindCodes.specialOffer;
  const isCategorySale = kindCode === PromotionKindCodes.saleOnCategories;

  const columns = useMemo<DataGridColumn<PromotionRuleResponse>[]>(() => {
    const list: DataGridColumn<PromotionRuleResponse>[] = [
      { key: "name", header: translateMessage("promotions.rules.column.name"), render: (rule) => <strong>{rule.name}</strong> },
    ];
    if (isOffer) list.push({ key: "lineCount", header: translateMessage("promotions.rules.column.products"), alignment: "end", render: (rule) => <span dir="ltr">{rule.lineCount}</span> });
    else list.push({ key: "discountPercent", header: translateMessage("promotions.rules.column.percent"), alignment: "end", sortValue: (rule) => rule.discountPercent, render: (rule) => <span dir="ltr">{translateMessage("promotions.rules.percentValue", { percent: rule.discountPercent ?? 0 })}</span> });
    list.push({
      key: "storeCount",
      header: translateMessage("promotions.rules.column.stores"),
      isSecondary: true,
      render: (rule) => (rule.storeCount === 0 ? translateMessage("promotions.common.everyStore") : translateMessage("promotions.common.storesCount", { count: rule.storeCount })),
    });
    if (isCategorySale) list.push({ key: "categoryCount", header: translateMessage("promotions.rules.column.categories"), alignment: "end", isSecondary: true, render: (rule) => <span dir="ltr">{rule.categoryCount}</span> });
    list.push(
      { key: "startsAt", header: translateMessage("promotions.rules.column.starts"), isSecondary: true, render: (rule) => <span dir="ltr">{formatPromotionMoment(rule.startsAt, languageCode)}</span> },
      {
        key: "endsAt",
        header: translateMessage("promotions.rules.column.ends"),
        isSecondary: true,
        sortValue: (rule) => rule.endsAt ?? "",
        render: (rule) => (rule.endsAt ? <span dir="ltr">{formatPromotionMoment(rule.endsAt, languageCode)}</span> : translateMessage("promotions.common.noEnd")),
      },
      { key: "phaseCode", header: translateMessage("promotions.rules.column.phase"), render: (rule) => <PromotionPhaseBadge phaseCode={rule.phaseCode} /> },
      {
        key: "actions",
        header: translateMessage("promotions.rules.column.actions"),
        alignment: "end",
        render: (rule) => (
          <div className="flex flex-wrap justify-end gap-2">
            <PermissionGate requirement={requireAnyPermission(configuration.permissions.edit)}>
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "edit", ruleId: rule.id })}>
                {translateMessage("promotions.rules.action.edit")}
              </Button>
            </PermissionGate>
            <PermissionGate requirement={requireAnyPermission(configuration.permissions.delete)}>
              <Button type="button" size="sm" variant="destructive" onClick={() => setRuleToDelete(rule)}>
                {translateMessage("promotions.rules.action.delete")}
              </Button>
            </PermissionGate>
          </div>
        ),
      },
    );
    return list;
  }, [translateMessage, languageCode, isOffer, isCategorySale, configuration.permissions.edit, configuration.permissions.delete]);

  async function handleDelete() {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    const result = await apiRequest<void>(configuration.endpointOfRule(ruleToDelete.id), { method: "DELETE" });
    setIsDeleting(false);
    setRuleToDelete(null);
    if (!result.ok) return showToast(result.problem.message, ToneNames.danger);
    showToast(translateMessage("promotions.ruleForm.toast.deleted"), ToneNames.success);
    rules.refetch();
  }

  async function handleRefreshPrices() {
    setIsRefreshing(true);
    const result = await apiRequest<void>(ApiEndpoints.promotions.refreshPrices, { method: "POST" });
    setIsRefreshing(false);
    if (!result.ok) return showToast(result.problem.message, ToneNames.danger);
    showToast(translateMessage("promotions.common.refreshed"), ToneNames.success);
    rules.refetch();
  }

  function closeDialog() {
    setDialog({ kind: "none" });
  }

  function handleSaved() {
    closeDialog();
    rules.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage(configuration.titleKey)}
        subtitle={translateMessage(configuration.subtitleKey)}
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.RESTRICTED_OPERATIONS.PROMOTIONS.PROMO_MANAGE)}>
              <Button type="button" variant="outline" disabled={isRefreshing} title={translateMessage("promotions.common.refreshHint")} onClick={() => void handleRefreshPrices()}>
                <RefreshCw />
                {translateMessage("promotions.common.refresh")}
              </Button>
            </PermissionGate>
            <PermissionGate requirement={requireAnyPermission(configuration.permissions.add)}>
              <Button type="button" onClick={() => setDialog({ kind: "create" })}>
                <Plus />
                {translateMessage(configuration.newKey)}
              </Button>
            </PermissionGate>
          </div>
        }
      />
      <SectionCard title={translateMessage(configuration.listTitleKey)} isPadded={false}>
        <DataGridTable
          rows={rules.data ?? []}
          columns={columns}
          getRowKey={(rule) => rule.id}
          caption={translateMessage(configuration.listTitleKey)}
          isLoading={rules.status === "loading"}
          errorMessage={rules.status === "error" ? (rules.problem?.message ?? translateMessage("promotions.rules.loadFailed")) : undefined}
          emptyTitle={translateMessage(configuration.emptyKey)}
          emptyText={translateMessage(configuration.emptyTextKey)}
        />
      </SectionCard>

      {dialog.kind === "create" && (
        <PromotionRuleDialog kindCode={kindCode} endpoint={configuration.listEndpoint} endpointOfRule={configuration.endpointOfRule} rule={null} onClose={closeDialog} onSaved={handleSaved} />
      )}
      {dialog.kind === "edit" && detail.status === "loading" && <LoadingIndicator />}
      {dialog.kind === "edit" && detail.data && (
        <PromotionRuleDialog kindCode={kindCode} endpoint={configuration.listEndpoint} endpointOfRule={configuration.endpointOfRule} rule={detail.data} onClose={closeDialog} onSaved={handleSaved} />
      )}
      <ConfirmDialog
        open={ruleToDelete !== null}
        onOpenChange={(open) => { if (!open) setRuleToDelete(null); }}
        onConfirm={() => void handleDelete()}
        isPending={isDeleting}
        titleMessageKey="promotions.rules.delete.title"
        descriptionMessageKey="promotions.rules.delete.text"
        confirmLabelMessageKey="promotions.rules.delete.confirm"
      />
    </div>
  );
}
