import {
  ContactStatusCodes,
  OpeningBalanceSideCodes,
  type ContactKind,
  type OpeningBalanceSideCode,
  type SaveContactRequest,
} from "../types/contactTypes";

// The limits and patterns mirror the backend (EFootwear.Domain/Contacts/ContactRules); the server checks them again.
export const ContactFormLimits = { nameMaximumLength: 120, phoneMaximumLength: 20, designationMaximumLength: 80, emailMaximumLength: 254 } as const;
const phonePattern = /^[+0-9][0-9 \-()]{4,19}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ContactFormValues = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  cityId: string;
  statusCode: string;
  creditLimit: number | null;
  designation: string;
  isManager: boolean;
  storeId: string;
  openingBalanceSideCode: OpeningBalanceSideCode;
  openingBalanceAmount: number | null;
  openingBalanceAsOfDate: string;
};

export type ContactFormField =
  | "name" | "phone" | "email" | "birthDate" | "creditLimit" | "designation" | "storeId" | "openingBalanceAsOfDate";
// The value is the message key without the prefix of the kind (for example "validation.nameRequired").
export type ContactFormErrors = Partial<Record<ContactFormField, string>>;

export function createEmptyContactForm(todayIsoDate: string): ContactFormValues {
  return {
    name: "", phone: "", email: "", birthDate: "", cityId: "", statusCode: ContactStatusCodes.active, creditLimit: null,
    designation: "", isManager: false, storeId: "", openingBalanceSideCode: OpeningBalanceSideCodes.debit,
    openingBalanceAmount: null, openingBalanceAsOfDate: todayIsoDate,
  };
}

// isCreating matters for staff only: the store is chosen when the staff member is created and changes later through a transfer.
export function validateContactForm(values: ContactFormValues, kind: ContactKind, isCreating: boolean, todayIsoDate: string): ContactFormErrors {
  const errors: ContactFormErrors = {};
  if (values.name.trim() === "") errors.name = "validation.nameRequired";
  else if (values.name.trim().length > ContactFormLimits.nameMaximumLength) errors.name = "validation.nameTooLong";
  if (values.phone.trim() === "") errors.phone = "validation.phoneRequired";
  else if (!phonePattern.test(values.phone.trim())) errors.phone = "validation.phoneFormat";
  if (values.email.trim() !== "" && !emailPattern.test(values.email.trim())) errors.email = "validation.emailFormat";
  if (values.birthDate !== "" && values.birthDate > todayIsoDate) errors.birthDate = "validation.birthDateFuture";
  if (kind === "vendor" && values.creditLimit !== null && values.creditLimit < 0) errors.creditLimit = "validation.creditLimitNegative";
  if (kind === "staff") {
    if (isCreating && values.storeId === "") errors.storeId = "validation.storeRequired";
    if (values.designation.length > ContactFormLimits.designationMaximumLength) errors.designation = "validation.designationTooLong";
  }
  if (values.openingBalanceAmount !== null && values.openingBalanceAmount > 0 && values.openingBalanceAsOfDate === "") {
    errors.openingBalanceAsOfDate = "validation.openingDateRequired";
  }
  return errors;
}

export function hasContactFormErrors(errors: ContactFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function emptyToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

// Fields of another kind are never sent: a customer request has no credit limit, a vendor request has no store.
export function toSaveContactRequest(values: ContactFormValues, kind: ContactKind): SaveContactRequest {
  const request: SaveContactRequest = {
    name: values.name.trim(),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    birthDate: emptyToNull(values.birthDate),
    cityId: values.cityId === "" ? null : values.cityId,
    statusCode: values.statusCode,
    openingBalance:
      values.openingBalanceAmount !== null && values.openingBalanceAmount > 0
        ? { sideCode: values.openingBalanceSideCode, amount: values.openingBalanceAmount, asOfDate: values.openingBalanceAsOfDate }
        : null,
  };
  if (kind === "vendor") request.creditLimit = values.creditLimit;
  if (kind === "staff") {
    request.designation = emptyToNull(values.designation);
    request.isManager = values.isManager;
    request.storeId = values.storeId === "" ? null : values.storeId;
  }
  return request;
}
