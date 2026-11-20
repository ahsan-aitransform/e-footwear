import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FootwearPOS", template: "%s · FootwearPOS" },
  description: "Multi-store footwear retail: sales, stock, purchasing and accounts.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f56e0" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
