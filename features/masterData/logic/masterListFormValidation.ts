import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { MasterListItemResponse, SaveMasterListItemRequest } from "../types/masterListTypes";

// The limits of the master list screens. They mirror the backend rules (MasterListRules); the server checks them again.
export const MasterListLimits = {
  nameMaximumLength: 120,
  codeMaximumLength: 40,
  sortOrderMaximum: 100_000,
} as const;

export type MasterListFormValues = {
  name: string;
  nameUrdu: string;
  code: string;
  // Typed text; turned into a whole number when saving.
  sortOrderText: string;
  isActive: boolean;
};

export type MasterListFormField = "name" | "nameUrdu" | "code" | "sortOrder";
export type MasterListFormErrors = Partial<Record<MasterListFormField, MessageKey>>;

export const emptyMasterListFormValues: MasterListFormValues = {
  name: "",
  nameUrdu: "",
  code: "",
  sortOrderText: "0",
  isActive: true,
};

export function masterListFormValuesFromItem(item: MasterListItemResponse): MasterListFormValues {
  return {
    name: item.name,
    nameUrdu: item.nameUrdu ?? "",
    code: item.code ?? "",
    sortOrderText: String(item.sortOrder),
    isActive: item.isActive,
  };
}

// "  Men    Shoes " -> "Men Shoes" (the server does the same, so what is shown is what is saved).
export function collapseWhiteSpace(text: string): string {
  return text.split(/\s+/).filter((part) => part !== "").join(" ");
}

function parseSortOrder(sortOrderText: string): number | null {
  const trimmed = sortOrderText.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function validateMasterListForm(values: MasterListFormValues): MasterListFormErrors {
  const errors: MasterListFormErrors = {};
  const name = collapseWhiteSpace(values.name);
  if (name === "") errors.name = "masterData.validation.nameRequired";
  else if (name.length > MasterListLimits.nameMaximumLength) errors.name = "masterData.validation.nameTooLong";

  if (collapseWhiteSpace(values.nameUrdu).length > MasterListLimits.nameMaximumLength) errors.nameUrdu = "masterData.validation.nameTooLong";
  if (collapseWhiteSpace(values.code).length > MasterListLimits.codeMaximumLength) errors.code = "masterData.validation.codeTooLong";

  const sortOrder = parseSortOrder(values.sortOrderText);
  if (sortOrder === null || sortOrder > MasterListLimits.sortOrderMaximum) errors.sortOrder = "masterData.validation.sortOrderInvalid";
  return errors;
}

export function hasFormErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

// The request body of a valid form: text trimmed, empty optional text sent as null.
export function toSaveMasterListItemRequest(values: MasterListFormValues): SaveMasterListItemRequest {
  const optional = (text: string) => {
    const collapsed = collapseWhiteSpace(text);
    return collapsed === "" ? null : collapsed;
  };
  return {
    name: collapseWhiteSpace(values.name),
    nameUrdu: optional(values.nameUrdu),
    code: optional(values.code),
    sortOrder: parseSortOrder(values.sortOrderText) ?? 0,
    isActive: values.isActive,
  };
}
