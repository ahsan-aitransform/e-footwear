// SINGLE SOURCE OF TRUTH FOR EVERY API PATH. Paths are relative to API_BASE_PATH.
// The browser calls the API through the same-origin proxy of next.config.ts, so no CORS setup is needed.
// No other file may contain a literal "/auth/..." style path.
//
// Adding an endpoint: append it inside the group of its module (or add a new group) above the marker.

export const API_BASE_PATH = "/api/v1";
export const API_HEALTH_PATH = "/health";

export const ApiEndpoints = {
  authentication: {
    companyLogin: "/auth/login",
    logout: "/auth/logout",
    changePassword: "/auth/change-password",
    currentSession: "/auth/me",
    requestPasswordReset: "/auth/password-reset/request",
    completePasswordReset: "/auth/password-reset/complete",
  },
  platformAuthentication: {
    login: "/platform/auth/login",
    logout: "/platform/auth/logout",
  },
  permissions: {
    catalog: "/permissions/catalog",
  },
  platformCompanies: {
    list: "/platform/companies",
    create: "/platform/companies",
    storesOfCompany: (companyId: string) => `/platform/companies/${encodeURIComponent(companyId)}/stores`,
  },
  stores: {
    listAccessibleStores: "/stores",
  },
  users: {
    list: "/users",
    creationOptions: "/users/creation-options",
    create: "/users",
    details: (userId: string) => `/users/${encodeURIComponent(userId)}`,
    update: (userId: string) => `/users/${encodeURIComponent(userId)}`,
    remove: (userId: string) => `/users/${encodeURIComponent(userId)}`,
    block: (userId: string) => `/users/${encodeURIComponent(userId)}/block`,
    unblock: (userId: string) => `/users/${encodeURIComponent(userId)}/unblock`,
    resetPassword: (userId: string) => `/users/${encodeURIComponent(userId)}/reset-password`,
    issuePasswordResetToken: (userId: string) => `/users/${encodeURIComponent(userId)}/password-reset-token`,
    permissions: (userId: string) => `/users/${encodeURIComponent(userId)}/permissions`,
    sessionsOfUser: (userId: string) => `/users/${encodeURIComponent(userId)}/sessions`,
    sessionOfUser: (userId: string, sessionId: string) =>
      `/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`,
    quickActions: (userId: string) => `/users/${encodeURIComponent(userId)}/quick-actions`,
    activity: "/users/activity",
    loginHistory: "/users/login-history",
  },
  // The signed-in person's own account: sessions, sign-in history, quick-action toolbar (no permission needed).
  account: {
    sessions: "/account/sessions",
    endOtherSessions: "/account/sessions/others",
    session: (sessionId: string) => `/account/sessions/${encodeURIComponent(sessionId)}`,
    loginHistory: "/account/login-history",
    quickActions: "/account/quick-actions",
  },
  roleTemplates: {
    list: "/role-templates",
    byKey: (templateKey: string) => `/role-templates/${encodeURIComponent(templateKey)}`,
    create: "/role-templates",
    update: (templateId: string) => `/role-templates/${encodeURIComponent(templateId)}`,
    remove: (templateId: string) => `/role-templates/${encodeURIComponent(templateId)}`,
  },
  devices: {
    list: "/devices",
    register: "/devices",
    byId: (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}`,
    update: (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}`,
    authorize: (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}/authorize`,
    revoke: (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}/revoke`,
    rotateToken: (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}/rotate-token`,
  },
  // Settings module
  companySettings: {
    businessInfo: "/settings/business-info",
    regionalPreferences: "/settings/regional-preferences",
    printing: "/settings/printing",
    tax: "/settings/tax",
    inventoryPolicy: "/settings/inventory-policy",
    promotionPolicy: "/settings/promotion-policy",
    paymentMethods: "/settings/payment-methods",
    enabledPaymentMethods: "/settings/payment-methods/enabled",
    storeBusinessInfo: (storeId: string) => `/settings/stores/${encodeURIComponent(storeId)}/business-info`,
    storePrinting: (storeId: string) => `/settings/stores/${encodeURIComponent(storeId)}/printing`,
    companyProfile: "/settings/company-profile",
    companyLogo: "/settings/company-logo",
    companyLogoInformation: "/settings/company-logo/information",
  },
  storeManagement: {
    list: "/store-management",
    planUsage: "/store-management/plan-usage",
    create: "/store-management",
    detail: (storeId: string) => `/store-management/${encodeURIComponent(storeId)}`,
    activate: (storeId: string) => `/store-management/${encodeURIComponent(storeId)}/activate`,
    deactivate: (storeId: string) => `/store-management/${encodeURIComponent(storeId)}/deactivate`,
  },
  documentNumbering: {
    list: "/document-numbering",
    setNextValue: "/document-numbering",
  },
  posTerminals: {
    list: "/pos-terminals",
  },
  userPreferences: {
    ownPreferences: "/my-preferences",
  },
  backup: {
    overview: "/backup/overview",
    restoreOverview: "/backup/restore-overview",
  },
  platformPlans: {
    list: "/platform/plans",
    create: "/platform/plans",
    update: (planCode: string) => `/platform/plans/${encodeURIComponent(planCode)}`,
  },
  platformCompanyAdministration: {
    detail: (companyId: string) => `/platform/companies/${encodeURIComponent(companyId)}`,
    assignPlan: (companyId: string) => `/platform/companies/${encodeURIComponent(companyId)}/plan`,
    setStatus: (companyId: string) => `/platform/companies/${encodeURIComponent(companyId)}/status`,
  },
  platformAuditLog: {
    list: "/platform/audit-log",
  },
  platformBackup: {
    overview: "/platform/backup/overview",
  },
  // Master data (module masterdata-parties). The list paths are used with the helpers below.
  masterData: {
    departments: "/departments",
    brands: "/brands",
    seasons: "/seasons",
    genders: "/genders",
    colors: "/colors",
    locations: "/locations",
    units: "/units",
    cities: "/cities",
    sizeGroups: "/size-groups",
    productTypes: "/product-types",
    categories: "/categories",
    optionsOfList: (listPath: string) => `${listPath}/options`,
    itemOfList: (listPath: string, itemId: string) => `${listPath}/${encodeURIComponent(itemId)}`,
    sizesOfSizeGroup: (sizeGroupId: string) => `/size-groups/${encodeURIComponent(sizeGroupId)}/sizes`,
    sizeOfSizeGroup: (sizeGroupId: string, sizeId: string) =>
      `/size-groups/${encodeURIComponent(sizeGroupId)}/sizes/${encodeURIComponent(sizeId)}`,
  },
  chartOfAccounts: {
    mainTypes: "/chart-of-accounts/main-types",
    groups: "/chart-of-accounts/groups",
    nextGroupCode: "/chart-of-accounts/groups/next-code",
    groupByCode: (groupCode: string) => `/chart-of-accounts/groups/${encodeURIComponent(groupCode)}`,
    accounts: "/chart-of-accounts/accounts",
    nextAccountCode: "/chart-of-accounts/accounts/next-code",
    accountById: (accountId: string) => `/chart-of-accounts/accounts/${encodeURIComponent(accountId)}`,
  },
  openingBalances: {
    sheet: "/opening-balances",
  },
  parties: {
    list: "/parties",
    search: "/parties/search",
    lookup: "/parties/lookup",
    byId: (partyId: string) => `/parties/${encodeURIComponent(partyId)}`,
    staffTransfers: (partyId: string) => `/parties/${encodeURIComponent(partyId)}/staff-transfers`,
  },
  partyLedger: {
    ledger: "/party-ledger",
  },
  promises: {
    list: "/promises",
    byId: (promiseId: string) => `/promises/${encodeURIComponent(promiseId)}`,
    customerBalance: (customerPartyId: string) => `/promises/customers/${encodeURIComponent(customerPartyId)}/balance`,
  },
  cashCounts: {
    list: "/cash-counts",
    context: "/cash-counts/context",
  },
  vouchers: {
    list: "/vouchers",
    byId: (voucherId: string) => `/vouchers/${encodeURIComponent(voucherId)}`,
    byNumber: "/vouchers/by-number",
    description: (voucherId: string) => `/vouchers/${encodeURIComponent(voucherId)}/description`,
    void: (voucherId: string) => `/vouchers/${encodeURIComponent(voucherId)}/void`,
    report: "/vouchers/report",
    payment: { entryContext: "/vouchers/payment/entry-context", targets: "/vouchers/payment/targets", post: "/vouchers/payment" },
    receipt: { entryContext: "/vouchers/receipt/entry-context", targets: "/vouchers/receipt/targets", post: "/vouchers/receipt" },
    expense: { entryContext: "/vouchers/expense/entry-context", targets: "/vouchers/expense/targets", post: "/vouchers/expense" },
    journal: { entryContext: "/vouchers/journal/entry-context", targets: "/vouchers/journal/targets", post: "/vouchers/journal" },
  },
  accountReports: {
    accounts: "/account-reports/accounts",
    balanceTypes: "/account-reports/balance-types",
    ledger: "/account-reports/ledger",
    balances: "/account-reports/balances",
    trialBalance: "/account-reports/trial-balance",
    detailTrialBalance: "/account-reports/detail-trial-balance",
    generalJournal: "/account-reports/general-journal",
  },
  accountingPeriods: {
    list: "/accounting-periods",
    close: "/accounting-periods/close",
    reopen: "/accounting-periods/reopen",
  },
  cashAndBankBalances: {
    balances: "/cash-and-bank-balances",
  },
  // Catalogue (module catalogue, docx chapter 4): products with their sizes, prices, discounts, barcodes and price bands.
  products: {
    list: "/products",
    variants: "/products/variants",
    variantsSearch: "/products/variants/search",
    variantsForDiscounts: "/products/variants/for-discounts",
    variantsForDiscountRemoval: "/products/variants/for-discount-removal",
    byId: (productId: string) => `/products/${encodeURIComponent(productId)}`,
    nextCode: "/products/next-code",
    priceHistory: (productId: string) => `/products/${encodeURIComponent(productId)}/price-history`,
    image: (productId: string, slot: number) => `/products/${encodeURIComponent(productId)}/images/${slot}`,
    priceCheck: "/products/price-check",
    ledger: "/products/ledger",
    stockByStore: "/products/stock-by-store",
    report: "/products/report",
  },
  productPrices: {
    oldToNewPreview: "/product-prices/old-to-new/preview",
    oldToNew: "/product-prices/old-to-new",
    percentagePreview: "/product-prices/percentage/preview",
    percentage: "/product-prices/percentage",
    newSalePrice: "/product-prices/new-sale-price",
  },
  productDiscounts: {
    stockRangePreview: "/product-discounts/stock-range/preview",
    stockRange: "/product-discounts/stock-range",
    storeRows: "/product-discounts/stores",
    onStores: "/product-discounts/on-stores",
    remove: "/product-discounts/remove",
  },
  productAttributes: {
    productsWithValue: "/product-attributes/products",
    apply: "/product-attributes/apply",
  },
  barcodes: {
    replacementFile: "/barcodes/replacement-file",
    replacementPreview: "/barcodes/replacement-preview",
    replace: "/barcodes/replace",
    history: "/barcodes/history",
    labels: "/barcodes/labels",
  },
  priceBands: {
    list: "/price-bands",
    byId: (priceBandId: string) => `/price-bands/${encodeURIComponent(priceBandId)}`,
  },
  // <api-endpoints:end> (shared file: append new groups above this marker, with Edit only)
} as const;
