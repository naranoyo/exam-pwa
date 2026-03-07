// app/layout.tsx
import type { Metadata, Viewport } from "next";
import React from "react";
import "./globals.css";
import { AppProvider } from "@/lib/state";
import { ToastProvider } from "@/lib/toast";
import { ToastHost } from "@/components/ui/ToastHost";

export const metadata: Metadata = {
  title: "合格あぷり",
  description: "試験勉強の記録と過去問演習をまとめる学習アプリ",
  applicationName: "合格あぷり",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192-v2.png",
    apple: "/icons/icon-192-v2.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "合格あぷり",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="min-h-dvh">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192-v2.png" />
      </head>

      <body className="min-h-dvh overflow-y-auto overscroll-y-contain">
        <ToastProvider>
          <AppProvider>
            {children}
            <ToastHost placement="top-center" durationMs={8000} />
          </AppProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
