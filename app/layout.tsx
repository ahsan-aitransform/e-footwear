import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { AccessNoticeAnnouncer } from "@/components/permissions/AccessNoticeAnnouncer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { DEFAULT_LANGUAGE_CODE, textDirectionByLanguageCode } from "@/lib/constants/languageCodes";
import { buildPreHydrationScript } from "@/lib/theme/preHydrationScript";

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
  description: "Footwear and retail point of sale",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang, dir and the dark class are set from the person's saved preferences by the inline script before the first
    // paint, so the server markup differs from the browser's on purpose: suppressHydrationWarning.
    <html
      lang={DEFAULT_LANGUAGE_CODE}
      dir={textDirectionByLanguageCode[DEFAULT_LANGUAGE_CODE]}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildPreHydrationScript() }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          {/* usePathname() needs a Suspense boundary on dynamic routes (Cache Components) */}
          <Suspense fallback={null}>
            <AccessNoticeAnnouncer />
          </Suspense>
          <ServiceWorkerRegister />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
