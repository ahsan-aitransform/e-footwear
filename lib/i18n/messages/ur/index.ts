// The Urdu catalogue. It must provide every key of the English catalogue (the type below enforces it, and
// messageCatalogues.test.ts checks that no text is empty). All Urdu text is an assistant draft awaiting review by a
// native speaker; until a text is reviewed it still shows, it is never replaced by English.
//
// Adding a module's messages: see en/index.ts (one import line and one spread line above the markers).
import type { englishMessages } from "../en";
import { commonUrduMessages } from "./common";
import { dashboardsUrduMessages } from "./dashboards";
import { designSystemUrduMessages } from "./designSystem";
import { navigationUrduMessages } from "./navigation";
import { platformUrduMessages } from "./platform";
import { securityUrduMessages } from "./security";
import { settingsUrduMessages } from "./settings";
import { securityManagementUrduMessages } from "./securityManagement";
import { masterDataUrduMessages } from "./masterData";
import { partiesUrduMessages } from "./parties";
import { accountingUrduMessages } from "./accounting";
import { cashManagementUrduMessages } from "./cashManagement";
// <urdu-messages-imports:end>

export const urduMessages: Record<keyof typeof englishMessages, string> = {
  ...commonUrduMessages,
  ...navigationUrduMessages,
  ...designSystemUrduMessages,
  ...securityUrduMessages,
  ...platformUrduMessages,
  ...dashboardsUrduMessages,
  ...settingsUrduMessages,
  ...securityManagementUrduMessages,
  ...masterDataUrduMessages,
  ...partiesUrduMessages,
  ...accountingUrduMessages,
  ...cashManagementUrduMessages,
  // <urdu-messages-spread:end>
};
