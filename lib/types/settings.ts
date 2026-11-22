// Shapes of the Settings API (backend: EFootwear.BLL/Core/Contracts and EFootwear.Domain/Core/Settings). camelCase JSON.
// A value that is null was never configured: the screens show "not configured" and no module invents a rule for it.

export type SettingsDocumentResponse<TValues> = { values: TValues; rowVersion: number; isStored: boolean };
export type StoreSettingsDocumentResponse<TValues> = {
  overrides: TValues;
  effective: TValues;
  rowVersion: number;
  isStored: boolean;
};
export type SaveSettingsRequest<TValues> = { values: TValues; expectedRowVersion: number | null };

export type BusinessInfoSettings = {
  businessName: string | null;
  barcodeName: string | null;
  businessNameUrdu: string | null;
  phoneNumber: string | null;
  mobileNumber: string | null;
  email: string | null;
  addressEnglish: string | null;
  addressUrdu: string | null;
  invoiceText: string | null;
};

export type RegionalPreferencesSettings = {
  dateFormat: string | null;
  timeFormat: string | null;
  defaultLanguageCode: string | null;
};

export type PrintingSettings = {
  defaultPrintFormat: string | null;
  printLanguageCode: string | null;
  printRightToLeft: boolean | null;
  printLogoOnDocuments: boolean | null;
  barcodeLabelWidthMillimetres: number | null;
  barcodeLabelHeightMillimetres: number | null;
  receiptCopies: number | null;
};

export type TaxSettings = { isTaxEnabled: boolean | null; defaultTaxRatePercentage: number | null };

export type InventoryPolicySettings = {
  allowNegativeStock: boolean | null;
  allowBackdatedStockAdjustments: boolean | null;
  backdatedStockAdjustmentMaximumDays: number | null;
};

export type PromotionPolicySettings = { maximumManualDiscountPercentage: number | null };

export type PaymentMethodSetting = {
  code: string;
  isEnabled: boolean;
  displayNameEnglish: string | null;
  displayNameUrdu: string | null;
  sortOrder: number;
};
export type PaymentMethodsSettings = { methods: PaymentMethodSetting[] };

export type UserPreferencesSettings = {
  languageCode: string | null;
  themeCode: string | null;
  defaultStoreId: string | null;
};

export type CompanyProfileResponse = {
  id: string;
  name: string;
  legalName: string | null;
  ntn: string | null;
  strn: string | null;
  timezone: string;
  currencyCode: string;
  roundingMode: string;
  priceBandBasis: string;
  invoiceText: string | null;
  planCode: string;
  status: string;
  rowVersion: number;
};

export type UpdateCompanyProfileRequest = {
  legalName: string | null;
  ntn: string | null;
  strn: string | null;
  timezone: string;
  currencyCode: string;
  roundingMode: string;
  priceBandBasis: string;
  expectedRowVersion: number | null;
};

export type CompanyLogoResponse = { attachmentId: string; contentType: string; sizeBytes: number; uploadedAt: string };

export type DocumentNumberSeriesResponse = {
  storeId: string;
  seriesCode: string;
  periodKey: string;
  nextValue: number;
  isStored: boolean;
};
export type SetDocumentNumberRequest = { storeId: string; seriesCode: string; nextValue: number };

export type PosTerminalResponse = {
  id: string;
  storeId: string;
  storeCode: string;
  label: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
};

export type BackupHealthResponse = {
  lastBaseBackupAt: string | null;
  lastWalArchiveAt: string | null;
  lastCompanyExportAt: string | null;
  failedRunsLastSevenDays: number;
  lastRestoreDrillAt: string | null;
  lastPassedRestoreDrillAt: string | null;
  baseBackupStatus: string;
  walArchiveStatus: string;
  restoreTestStatus: string;
};
export type CompanyExportResponse = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  sizeBytes: number | null;
  isEncrypted: boolean;
};
export type RestoreDrillResponse = {
  id: string;
  startedAt: string;
  finishedAt: string;
  outcome: string;
  measuredRtoMinutes: number | null;
  measuredRpoMinutes: number | null;
  rowsChecked: number | null;
};
export type BackupRunResponse = {
  id: string;
  kind: string;
  companyId: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  storageLocation: string;
  sizeBytes: number | null;
  isEncrypted: boolean;
  errorMessage: string | null;
};
export type CompanyBackupOverviewResponse = { health: BackupHealthResponse | null; exports: CompanyExportResponse[] };
export type RestoreOverviewResponse = { health: BackupHealthResponse | null; drills: RestoreDrillResponse[] };
export type PlatformBackupOverviewResponse = {
  health: BackupHealthResponse | null;
  runs: BackupRunResponse[];
  drills: RestoreDrillResponse[];
};
