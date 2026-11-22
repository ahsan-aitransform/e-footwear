"use client";

import { FormField } from "@/components/forms/FormField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CatalogueLookups } from "../hooks/useCatalogueLookups";
import type { ProductListFilterValues } from "../types/catalogueTypes";

export type CatalogueFilterFieldName = "storeId" | "departmentId" | "categoryId" | "brandId" | "genderId" | "seasonId" | "colorId";

const lookupByField = {
  storeId: "storeOptions",
  departmentId: "departmentOptions",
  categoryId: "categoryOptions",
  brandId: "brandOptions",
  genderId: "genderOptions",
  seasonId: "seasonOptions",
  colorId: "colorOptions",
} as const satisfies Record<CatalogueFilterFieldName, keyof CatalogueLookups>;

const labelByField = {
  storeId: "catalogue.filter.store",
  departmentId: "catalogue.filter.department",
  categoryId: "catalogue.filter.category",
  brandId: "catalogue.filter.brand",
  genderId: "catalogue.filter.gender",
  seasonId: "catalogue.filter.season",
  colorId: "catalogue.filter.color",
} as const;

// The dropdown filters of the product screens. Each is searchable and can be cleared ("all"). Choosing another department
// clears the category, because categories belong to one department.
export function CatalogueFilterFields({
  fields,
  values,
  onChange,
  lookups,
}: {
  fields: readonly CatalogueFilterFieldName[];
  values: ProductListFilterValues;
  onChange: (values: ProductListFilterValues) => void;
  lookups: CatalogueLookups;
}) {
  const { translateMessage } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((field) => (
        <FormField key={field} label={translateMessage(labelByField[field])} name={`catalogue-filter-${field}`}>
          {(controlProps) => (
            <SearchableSelect
              {...controlProps}
              options={lookups[lookupByField[field]]}
              value={values[field] ?? null}
              isClearable
              placeholder={translateMessage("catalogue.filter.all")}
              onValueChange={(next) => onChange({ ...values, [field]: next ?? undefined, ...(field === "departmentId" ? { categoryId: undefined } : {}) })}
            />
          )}
        </FormField>
      ))}
    </div>
  );
}
