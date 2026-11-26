import {
  createEmptyContactForm,
  validateContactForm,
  type ContactFormErrors,
} from "@/features/contacts/logic/contactFormValidation";
import {
  ContactStatusCodes,
  CustomerTypeCodes,
  type ContactDetailResponse,
  type CustomerTypeCode,
  type SaveContactRequest,
} from "@/features/contacts/types/contactTypes";

// The Add / Edit customer dialog: the name and the mobile number are required; the CNIC, the date of birth, the e-mail and the city are optional.
// The pattern mirrors the backend (EFootwear.Domain/Customers/CustomerRules); the server checks it again.
const cnicPattern = /^([0-9]{13}|[0-9]{5}-[0-9]{7}-[0-9])$/;
export const CNIC_MAXIMUM_LENGTH = 15;

export type CustomerFormValues = {
  name: string;
  phone: string;
  cnic: string;
  customerTypeCode: CustomerTypeCode;
  birthDate: string;
  email: string;
  cityId: string;
};

export type CustomerFormField = "name" | "phone" | "cnic" | "birthDate" | "email";
// The value is the message key without the "customers." prefix.
export type CustomerFormErrors = Partial<Record<CustomerFormField, string>>;

export const emptyCustomerForm: CustomerFormValues = {
  name: "", phone: "", cnic: "", customerTypeCode: CustomerTypeCodes.regular, birthDate: "", email: "", cityId: "",
};

export function valuesFromCustomer(customer: ContactDetailResponse): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    cnic: customer.cnic ?? "",
    customerTypeCode: customer.customerTypeCode ?? CustomerTypeCodes.regular,
    birthDate: customer.birthDate ?? "",
    email: customer.email ?? "",
    cityId: customer.cityId ?? "",
  };
}

export function validateCustomerForm(values: CustomerFormValues, todayIsoDate: string): CustomerFormErrors {
  // The name, mobile, e-mail and birth date rules are the ones every contact has.
  const shared: ContactFormErrors = validateContactForm(
    { ...createEmptyContactForm(todayIsoDate), name: values.name, phone: values.phone, email: values.email, birthDate: values.birthDate },
    "customer",
    true,
    todayIsoDate,
  );
  const errors = shared as CustomerFormErrors;
  if (values.cnic.trim() !== "" && !cnicPattern.test(values.cnic.trim())) errors.cnic = "validation.cnicFormat";
  return errors;
}

function emptyToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

// The dialog has no status and no account section: a new customer is active, an edited one keeps its status, and no opening balance is sent
// (the server then leaves the books as they are).
export function toSaveCustomerRequest(values: CustomerFormValues, statusCode: string = ContactStatusCodes.active): SaveContactRequest {
  return {
    name: values.name.trim(),
    phone: emptyToNull(values.phone),
    cnic: emptyToNull(values.cnic),
    customerTypeCode: values.customerTypeCode,
    birthDate: emptyToNull(values.birthDate),
    email: emptyToNull(values.email),
    cityId: values.cityId === "" ? null : values.cityId,
    statusCode,
    openingBalance: null,
  };
}
