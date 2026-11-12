import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { Providers } from "@/components/shell/providers";
import { Shell } from "@/components/shell/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOCUS OS",
  description: "Osobisty system operacyjny: plan dnia, nauka, Aiven, trening i kontrola grania.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FOCUS OS", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08080a",
};

// Applies the saved theme before first paint so the app never flashes the wrong colours.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem("focusos:theme")||"dark"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" data-theme="dark" data-ego="observer" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
