"use client";

import { useMemo } from "react";
import type { SearchableSelectOption } from "@/components/forms/SearchableSelect";
import type { MasterListOptionResponse } from "@/features/masterData/types/masterListTypes";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import type { StoreSummaryResponse } from "@/lib/types/store";

export type LookupOptions = readonly SearchableSelectOption<string>[];

function toOptions(items: readonly MasterListOptionResponse[] | undefined): LookupOptions {
  return (items ?? []).map((item) => ({ value: item.id, label: item.name, description: item.code ?? undefined }));
}

// The dropdown lists of the product screens: the master lists (department, category, brand, season, gender, product type,
// unit, location, colour, size group) and the stores the person may work in. The category list follows the chosen department.
export function useCatalogueLookups(departmentId?: string) {
  const departments = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.departments));
  const categories = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.categories), {
    query: { departmentId: departmentId || undefined },
  });
  const brands = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.brands));
  const seasons = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.seasons));
  const genders = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.genders));
  const colors = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.colors));
  const productTypes = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.productTypes));
  const units = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.units));
  const locations = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.locations));
  const sizeGroups = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.sizeGroups));
  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores);

  const departmentOptions = useMemo(() => toOptions(departments.data), [departments.data]);
  const categoryOptions = useMemo(() => toOptions(categories.data), [categories.data]);
  const brandOptions = useMemo(() => toOptions(brands.data), [brands.data]);
  const seasonOptions = useMemo(() => toOptions(seasons.data), [seasons.data]);
  const genderOptions = useMemo(() => toOptions(genders.data), [genders.data]);
  const colorOptions = useMemo(() => toOptions(colors.data), [colors.data]);
  const productTypeOptions = useMemo(() => toOptions(productTypes.data), [productTypes.data]);
  const unitOptions = useMemo(() => toOptions(units.data), [units.data]);
  const locationOptions = useMemo(() => toOptions(locations.data), [locations.data]);
  const sizeGroupOptions = useMemo(() => toOptions(sizeGroups.data), [sizeGroups.data]);
  // The head office holds no stock and has no store prices, so it is not offered as a store.
  const storeOptions = useMemo<LookupOptions>(
    () => (stores.data ?? []).filter((store) => !store.isHeadOffice && store.isActive).map((store) => ({ value: store.id, label: store.name, description: store.code })),
    [stores.data],
  );

  return {
    departmentOptions,
    categoryOptions,
    brandOptions,
    seasonOptions,
    genderOptions,
    colorOptions,
    productTypeOptions,
    unitOptions,
    locationOptions,
    sizeGroupOptions,
    storeOptions,
  };
}

export type CatalogueLookups = ReturnType<typeof useCatalogueLookups>;
