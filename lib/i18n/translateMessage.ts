import { DEFAULT_LANGUAGE_CODE, LanguageCodes, type LanguageCode } from "@/lib/constants/languageCodes";
import { englishMessages } from "./messages/en";
import { urduMessages } from "./messages/ur";
import type { MessageKey } from "./messageKeys";

export type MessageParameters = Record<string, string | number>;

const messagesByLanguageCode: Record<LanguageCode, Record<MessageKey, string>> = {
  [LanguageCodes.english]: englishMessages,
  [LanguageCodes.urdu]: urduMessages,
};

// Replaces {name} placeholders. A placeholder without a value is left visible so the gap is noticed in testing.
export function fillMessageParameters(template: string, parameters?: MessageParameters): string {
  if (!parameters) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in parameters ? String(parameters[name]) : placeholder,
  );
}

// Looks a message up in the chosen language. A missing or empty text falls back to English, so a screen
// never shows a raw key. (The tests make sure both catalogues are complete; this is a runtime safety net.)
export function translateMessageForLanguage(
  languageCode: LanguageCode,
  messageKey: MessageKey,
  parameters?: MessageParameters,
): string {
  const text = messagesByLanguageCode[languageCode]?.[messageKey];
  const template = text && text.length > 0 ? text : messagesByLanguageCode[DEFAULT_LANGUAGE_CODE][messageKey];
  return fillMessageParameters(template, parameters);
}
