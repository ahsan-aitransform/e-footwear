"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { useTranslation } from "@/lib/i18n/useTranslation";

// The stores a promotion is for, as ticks (docx 2.15 "select stores from the list"). The person sees only the stores they may use. For a special offer, no tick
// means every store; the parent says so in the hint.
export function PromotionStoreCheckboxes({
  idPrefix,
  storeIds,
  onStoreIdsChange,
  errorMessage,
}: {
  idPrefix: string;
  storeIds: string[];
  onStoreIdsChange: (storeIds: string[]) => void;
  errorMessage?: string;
}) {
  const { translateMessage } = useTranslation();
  const { stores } = useAccessibleStores();
  const choosableStores = stores.filter((store) => !store.isHeadOffice);

  function toggle(storeId: string, isChecked: boolean) {
    onStoreIdsChange(isChecked ? [...storeIds, storeId] : storeIds.filter((id) => id !== storeId));
  }

  if (choosableStores.length === 0) return <p className="text-sm text-muted-foreground">{translateMessage("promotions.ruleForm.noStores")}</p>;
  return (
    <div className="space-y-2">
      <ul className="grid gap-2 sm:grid-cols-2">
        {choosableStores.map((store) => {
          const id = `${idPrefix}-${store.id}`;
          return (
            <li key={store.id} className="flex items-center gap-2">
              <Checkbox id={id} checked={storeIds.includes(store.id)} onCheckedChange={(checked) => toggle(store.id, checked === true)} />
              <Label htmlFor={id}>{store.name}</Label>
            </li>
          );
        })}
      </ul>
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
