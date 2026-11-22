"use client";

import { useCallback, useSyncExternalStore } from "react";
import { textDirectionByLanguageCode } from "@/lib/constants/languageCodes";
import { getLanguageSnapshot, getServerLanguageSnapshot, subscribeToLanguage } from "./languageStore";
import type { MessageKey } from "./messageKeys";
import { translateMessageForLanguage, type MessageParameters } from "./translateMessage";

export function useTranslation() {
  const languageCode = useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot, getServerLanguageSnapshot);
  const translateMessage = useCallback(
    (messageKey: MessageKey, parameters?: MessageParameters) =>
      translateMessageForLanguage(languageCode, messageKey, parameters),
    [languageCode],
  );
  return { translateMessage, languageCode, textDirection: textDirectionByLanguageCode[languageCode] };
}
