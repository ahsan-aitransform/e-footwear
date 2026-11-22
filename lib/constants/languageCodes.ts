// SINGLE SOURCE OF TRUTH FOR THE SUPPORTED LANGUAGES AND THEIR TEXT DIRECTION (Part 7 and Part 28: English and Urdu,
// right-to-left layout and printing).

export const LanguageCodes = {
  english: "en",
  urdu: "ur",
} as const;

export type LanguageCode = (typeof LanguageCodes)[keyof typeof LanguageCodes];

export const DEFAULT_LANGUAGE_CODE: LanguageCode = LanguageCodes.english;

export const TextDirections = {
  leftToRight: "ltr",
  rightToLeft: "rtl",
} as const;

export type TextDirection = (typeof TextDirections)[keyof typeof TextDirections];

export const textDirectionByLanguageCode: Record<LanguageCode, TextDirection> = {
  [LanguageCodes.english]: TextDirections.leftToRight,
  [LanguageCodes.urdu]: TextDirections.rightToLeft,
};

// A language is always shown in its own script, so a person can find it whatever language is active.
export const languageNativeNameByLanguageCode: Record<LanguageCode, string> = {
  [LanguageCodes.english]: "English",
  [LanguageCodes.urdu]: "اردو",
};

export const supportedLanguageCodes: readonly LanguageCode[] = Object.values(LanguageCodes);

export function isSupportedLanguageCode(value: string | null | undefined): value is LanguageCode {
  return typeof value === "string" && (supportedLanguageCodes as readonly string[]).includes(value);
}
