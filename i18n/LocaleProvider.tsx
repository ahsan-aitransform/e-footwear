"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translate, type Locale, type MessageKey } from "@/i18n/messages";

const LocaleContext = createContext<Locale | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }): ReactNode {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useT(): (key: MessageKey) => string {
  const locale = useContext(LocaleContext);
  if (locale === null) throw new Error("useT must be used inside <LocaleProvider>.");
  return (key) => translate(locale, key);
}
