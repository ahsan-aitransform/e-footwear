import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import "./globals.css";
import { dirOf } from "@/i18n/messages";
import { getT } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/LocaleProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Footwear",
  description: "Multi-tenant retail and footwear POS",
};

// Cache Components: request-time data (the language cookie) is read below a Suspense boundary so the shell stays static.
async function Localized({ children }: { children: ReactNode }) {
  const { locale } = await getT();
  return (
    <div lang={locale} dir={dirOf(locale)} className="flex min-h-full flex-1 flex-col">
      <LocaleProvider locale={locale}>{children}</LocaleProvider>
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <Suspense fallback={<p className="p-6 text-ink-muted">Loading…</p>}>
          <Localized>{children}</Localized>
        </Suspense>
      </body>
    </html>
  );
}
