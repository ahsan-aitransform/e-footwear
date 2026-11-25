// The English catalogue: the union of the per-module catalogues. English is the reference language: the set of message
// keys is the set of keys of this object, and the Urdu catalogue (ur/index.ts) must provide every one of them.
//
// Adding a module's messages: create en/<module>.ts and ur/<module>.ts (same keys), then add one import line and one
// spread line above the markers below (shared file: edit with Edit only).
import { commonEnglishMessages } from "./common";
import { dashboardsEnglishMessages } from "./dashboards";
import { designSystemEnglishMessages } from "./designSystem";
import { navigationEnglishMessages } from "./navigation";
import { platformEnglishMessages } from "./platform";
import { securityEnglishMessages } from "./security";
import { settingsEnglishMessages } from "./settings";
import { securityManagementEnglishMessages } from "./securityManagement";
import { masterDataEnglishMessages } from "./masterData";
import { cashEnglishMessages } from "./cash";
import { customersEnglishMessages } from "./customers";
import { staffEnglishMessages } from "./staff";
import { vendorsEnglishMessages } from "./vendors";
import { accountingEnglishMessages } from "./accounting";
import { cashManagementEnglishMessages } from "./cashManagement";
import { catalogueEnglishMessages } from "./catalogue";
import { humanResourcesEnglishMessages } from "./humanResources";
import { payrollEnglishMessages } from "./payroll";
import { salesEnglishMessages } from "./sales";
import { inventoryEnglishMessages } from "./inventory";
// <english-messages-imports:end>

export const englishMessages = {
  ...commonEnglishMessages,
  ...navigationEnglishMessages,
  ...designSystemEnglishMessages,
  ...securityEnglishMessages,
  ...platformEnglishMessages,
  ...dashboardsEnglishMessages,
  ...settingsEnglishMessages,
  ...securityManagementEnglishMessages,
  ...masterDataEnglishMessages,
  ...customersEnglishMessages,
  ...vendorsEnglishMessages,
  ...staffEnglishMessages,
  ...cashEnglishMessages,
  ...accountingEnglishMessages,
  ...cashManagementEnglishMessages,
  ...catalogueEnglishMessages,
  ...humanResourcesEnglishMessages,
  ...payrollEnglishMessages,
  ...salesEnglishMessages,
  ...inventoryEnglishMessages,
  // <english-messages-spread:end>
};
