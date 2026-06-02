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

// Reading the cc_theme cookie below already opts every route into dynamic
// rendering (cookies() is a request-time API — see Next 16 docs:
// 01-app/.../functions/cookies.md, "opt a route into dynamic rendering"), so
// the per-request render always sees the live cookie. We pin it explicitly to
// guarantee the html shell that carries data-theme is never served from the
// Full Route Cache / a CDN-cached static render, which was producing a stale
// data-theme on first visit. force-static would zero out cookies() and break
// the no-flash SSR entirely, so force-dynamic is the correct choice here.
export const dynamic = "force-dynamic";

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
        {/*
          Re-assert the theme from the live cookie before first paint. The
          server already sets data-theme above, but a cached HTML document or
          a client-cached shared layout (Next does not refetch layouts on
          every client navigation) can ship a stale value. This tiny blocking
          script reads the real cookie at load time and corrects data-theme
          with no flash — belt-and-braces against any RSC/CDN caching.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(dark|light)/);if(m&&m[1]){document.documentElement.setAttribute('data-theme',m[1]);}}catch(e){}})();`,
          }}
        />
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
