import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { THEME_COOKIE } from "@/lib/theme/cookie";
import { ToastProvider } from "@/components/ui/toast";
import { PwaRegistrar } from "@/components/pwa-registrar";

export const metadata: Metadata = {
  title: "Carrot Chase",
  description: "Gamified running competition platform for schools",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Carrot Chase",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8520A",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve theme on the server so the html element ships with the correct
  // data-theme attribute on first paint — no flash, no inline script needed.
  const cookieStore = await cookies();
  const stored = cookieStore.get(THEME_COOKIE)?.value;
  const initialTheme: "light" | "dark" = stored === "dark" ? "dark" : "light";

  return (
    <html
      lang="en-GB"
      className="h-full"
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider initial={initialTheme}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <PwaRegistrar />
      </body>
    </html>
  );
}
