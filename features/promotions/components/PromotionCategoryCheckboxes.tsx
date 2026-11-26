"use client";

import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { PromotionCategoryResponse } from "../types/promotionTypes";

// The categories of a sale on categories, listed as "Department -- Category" (docx 2.16) with a search box, because a company can have many.
export function PromotionCategoryCheckboxes({
  categoryIds,
  onCategoryIdsChange,
  errorMessage,
}: {
  categoryIds: string[];
  onCategoryIdsChange: (categoryIds: string[]) => void;
  errorMessage?: string;
}) {
  const { translateMessage } = useTranslation();
  const categories = useApiQuery<PromotionCategoryResponse[]>(ApiEndpoints.promotions.saleOnCategoriesCategoryOptions, { offlineCacheName: "promotion-category-options" });
  const [searchText, setSearchText] = useState("");

  const needle = searchText.trim().toLocaleLowerCase();
  const visibleCategories = (categories.data ?? []).filter((category) => `${category.departmentName} ${category.categoryName}`.toLocaleLowerCase().includes(needle));

  function toggle(categoryId: string, isChecked: boolean) {
    onCategoryIdsChange(isChecked ? [...categoryIds, categoryId] : categoryIds.filter((id) => id !== categoryId));
  }

  return (
    <div className="space-y-2">
      <Input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder={translateMessage("promotions.ruleForm.categoriesSearch")} aria-label={translateMessage("promotions.ruleForm.categoriesSearch")} />
      {categories.status === "error" && <InlineNotice>{translateMessage("promotions.ruleForm.categoriesLoadFailed")}</InlineNotice>}
      <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
        {visibleCategories.map((category) => {
          const id = `promotion-category-${category.categoryId}`;
          return (
            <li key={category.categoryId} className="flex items-center gap-2">
              <Checkbox id={id} checked={categoryIds.includes(category.categoryId)} onCheckedChange={(checked) => toggle(category.categoryId, checked === true)} />
              <Label htmlFor={id}>
                {category.departmentName} -- {category.categoryName}
              </Label>
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
