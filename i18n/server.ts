import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, translate, type Locale, type MessageKey } from "@/i18n/messages";
import { LANG_COOKIE } from "@/lib/server/session";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function getT(): Promise<{ locale: Locale; t: (key: MessageKey) => string }> {
  const locale = await getLocale();
  return { locale, t: (key) => translate(locale, key) };
}
