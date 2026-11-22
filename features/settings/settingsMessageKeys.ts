import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { PrintFormatCodes, TimeFormatCodes } from "@/lib/constants/settingsCodes";

// Message keys may only contain letters and underscores in their last segments (see lib/i18n/messageCatalogues.test.ts), so a code
// that contains a digit (A4, 12H) is mapped to a key by name here instead of being put into the key.
export const PrintFormatMessageKeys = {
  THERMAL: "settings.printing.format.thermalReceipt",
  A4: "settings.printing.format.paperSizeAFour",
  A5: "settings.printing.format.paperSizeAFive",
} as const satisfies Record<(typeof PrintFormatCodes)[number], MessageKey>;

export const TimeFormatMessageKeys = {
  "12H": "settings.regional.timeFormat.twelveHour",
  "24H": "settings.regional.timeFormat.twentyFourHour",
} as const satisfies Record<(typeof TimeFormatCodes)[number], MessageKey>;
