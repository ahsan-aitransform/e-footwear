import type { MessageKey } from "@/lib/i18n/messageKeys";
import {
  OpeningBalanceSideCodes,
  PartyStatusCodes,
  type OpeningBalanceSideCode,
  type SavePartyRequest,
} from "../types/partyTypes";

// The limits and patterns mirror the backend (EFootwear.Domain/Parties/PartyRules); the server checks them again.
export const PartyFormLimits = { nameMaximumLength: 120, addressMaximumLength: 500, notesMaximumLength: 1000, phoneMaximumLength: 20, designationMaximumLength: 80, emailMaximumLength: 254 } as const;
const cnicPattern = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
const phonePattern = /^[+0-9][0-9 \-()]{4,19}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type PartyFormValues = {
  name: string;
  nameUrdu: string;
  fatherName: string;
  cnic: string;
  cityId: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  address: string;
  notes: string;
  isCustomer: boolean;
  isVendor: boolean;
  isStaff: boolean;
  creditLimit: number | null;
  statusCode: string;
  designation: string;
  isManager: boolean;
  staffStoreId: string;
  openingBalanceSideCode: OpeningBalanceSideCode;
  openingBalanceAmount: number | null;
  openingBalanceAsOfDate: string;
};

export type PartyFormField =
  | "name" | "cnic" | "primaryPhone" | "secondaryPhone" | "email" | "address" | "notes" | "partyType" | "creditLimit" | "staffStoreId" | "designation" | "openingBalanceAsOfDate";
export type PartyFormErrors = Partial<Record<PartyFormField, MessageKey>>;

export function createEmptyPartyForm(todayIsoDate: string): PartyFormValues {
  return {
    name: "", nameUrdu: "", fatherName: "", cnic: "", cityId: "", primaryPhone: "", secondaryPhone: "", email: "", address: "", notes: "",
    isCustomer: true, isVendor: false, isStaff: false, creditLimit: null, statusCode: PartyStatusCodes.active, designation: "",
    isManager: false, staffStoreId: "", openingBalanceSideCode: OpeningBalanceSideCodes.debit, openingBalanceAmount: null,
    openingBalanceAsOfDate: todayIsoDate,
  };
}

export function validatePartyForm(values: PartyFormValues): PartyFormErrors {
  const errors: PartyFormErrors = {};
  if (values.name.trim() === "") errors.name = "parties.validation.nameRequired";
  else if (values.name.trim().length > PartyFormLimits.nameMaximumLength) errors.name = "parties.validation.nameTooLong";
  if (!values.isCustomer && !values.isVendor && !values.isStaff) errors.partyType = "parties.validation.partyTypeRequired";
  if (values.cnic.trim() !== "" && !cnicPattern.test(values.cnic.trim())) errors.cnic = "parties.validation.cnicFormat";
  if (values.primaryPhone.trim() !== "" && !phonePattern.test(values.primaryPhone.trim())) errors.primaryPhone = "parties.validation.phoneFormat";
  if (values.secondaryPhone.trim() !== "" && !phonePattern.test(values.secondaryPhone.trim())) errors.secondaryPhone = "parties.validation.phoneFormat";
  if (values.email.trim() !== "" && !emailPattern.test(values.email.trim())) errors.email = "parties.validation.emailFormat";
  if (values.address.length > PartyFormLimits.addressMaximumLength) errors.address = "parties.validation.addressTooLong";
  if (values.notes.length > PartyFormLimits.notesMaximumLength) errors.notes = "parties.validation.notesTooLong";
  if (values.creditLimit !== null && values.creditLimit < 0) errors.creditLimit = "parties.validation.creditLimitNegative";
  if (values.isStaff && values.staffStoreId === "") errors.staffStoreId = "parties.validation.staffStoreRequired";
  if (values.designation.length > PartyFormLimits.designationMaximumLength) errors.designation = "parties.validation.designationTooLong";
  if (values.openingBalanceAmount !== null && values.openingBalanceAmount > 0 && values.openingBalanceAsOfDate === "") {
    errors.openingBalanceAsOfDate = "parties.validation.openingDateRequired";
  }
  return errors;
}

export function hasPartyFormErrors(errors: PartyFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function emptyToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

// Staff-only fields are dropped when the party is not staff, so a person who stops being staff does not keep a stale store.
export function toSavePartyRequest(values: PartyFormValues): SavePartyRequest {
  return {
    name: values.name.trim(),
    nameUrdu: emptyToNull(values.nameUrdu),
    fatherName: emptyToNull(values.fatherName),
    fatherNameUrdu: null,
    cnic: emptyToNull(values.cnic),
    cityId: values.cityId === "" ? null : values.cityId,
    primaryPhone: emptyToNull(values.primaryPhone),
    secondaryPhone: emptyToNull(values.secondaryPhone),
    email: emptyToNull(values.email),
    address: emptyToNull(values.address),
    addressUrdu: null,
    notes: emptyToNull(values.notes),
    isCustomer: values.isCustomer,
    isVendor: values.isVendor,
    isStaff: values.isStaff,
    creditLimit: values.creditLimit,
    statusCode: values.statusCode,
    designation: values.isStaff ? emptyToNull(values.designation) : null,
    isManager: values.isStaff && values.isManager,
    staffStoreId: values.isStaff && values.staffStoreId !== "" ? values.staffStoreId : null,
    openingBalance:
      values.openingBalanceAmount !== null && values.openingBalanceAmount > 0
        ? { sideCode: values.openingBalanceSideCode, amount: values.openingBalanceAmount, asOfDate: values.openingBalanceAsOfDate }
        : null,
  };
}
