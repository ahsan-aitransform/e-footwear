// Size limits and ranges of the Settings forms. They mirror EFootwear.Domain.Core.Settings.SettingsLimits and AttachmentRules in
// the backend (the backend enforces them; the forms only show the limit so a person does not type past it).
export const SettingsLimits = {
  businessNameMaximumLength: 120,
  barcodeNameMaximumLength: 30,
  phoneNumberMaximumLength: 30,
  emailMaximumLength: 254,
  addressMaximumLength: 300,
  invoiceTextMaximumLength: 2000,
  legalNameMaximumLength: 200,
  taxNumberMaximumLength: 40,
  paymentMethodDisplayNameMaximumLength: 60,
  paymentMethodSortOrderMaximum: 999,
  labelDimensionMinimumMillimetres: 10,
  labelDimensionMaximumMillimetres: 200,
  receiptCopiesMinimum: 1,
  receiptCopiesMaximum: 10,
  backdatedAdjustmentMaximumDaysLimit: 3650,
  storeCodeMaximumLength: 20,
  storeNameMaximumLength: 120,
  planNameMaximumLength: 80,
  companyStatusReasonMaximumLength: 500,
} as const;

// The company logo: one image of at most this size, PNG, JPEG or WEBP.
export const LOGO_MAXIMUM_SIZE_BYTES = 1024 * 1024;
export const LOGO_ACCEPTED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
