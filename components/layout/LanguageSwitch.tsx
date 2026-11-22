"use client";

import { useId } from "react";
import {
  languageNativeNameByLanguageCode,
  supportedLanguageCodes,
  isSupportedLanguageCode,
} from "@/lib/constants/languageCodes";
import { setLanguage } from "@/lib/i18n/languageStore";
import { useTranslation } from "@/lib/i18n/useTranslation";

// Switches between English and Urdu. The page direction (left-to-right / right-to-left) follows at once.
// Each language is named in its own script so it can be found whatever language is active.
export function LanguageSwitch() {
  const { languageCode, translateMessage } = useTranslation();
  const selectId = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {translateMessage("shell.languageSwitchLabel")}
      </label>
      <select
        id={selectId}
        value={languageCode}
        onChange={(event) => {
          if (isSupportedLanguageCode(event.target.value)) setLanguage(event.target.value);
        }}
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
      >
        {supportedLanguageCodes.map((code) => (
          <option key={code} value={code}>
            {languageNativeNameByLanguageCode[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
