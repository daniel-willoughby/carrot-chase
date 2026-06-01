/**
 * Split-panel auth layout, ported from the prototype's LoginPage.
 *
 * Left (orange gradient) is the marketing pane: carrot mark, wordmark, tagline,
 * and three stat pills. Right (cream) is the actual form, supplied by each
 * route's page.tsx as children.
 *
 * On mobile both stack vertically; the gradient panel becomes a compact
 * header.
 */

// Auth pages read cookies / hit Supabase (invite token lookup, 2FA factor
// list) — keep them out of static prerendering so the build never blocks
// on a network call.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* ── Left: brand pane ─────────────────────────────────────────────── */}
      <section
        className="flex flex-col items-center justify-center px-5 py-7 text-white lg:flex-1 lg:py-12"
        style={{
          background: "linear-gradient(160deg, #EC5A10 0%, #D04A08 100%)",
        }}
      >
        <span
          className="mb-2.5 text-[40px] leading-none lg:mb-6 lg:text-[72px]"
          aria-hidden
        >
          🥕
        </span>
        <h1 className="mb-1.5 text-center text-[26px] font-extrabold tracking-tight lg:text-[40px]">
          Carrot Chase
        </h1>
        <p className="mb-4 text-center text-sm opacity-90 lg:mb-12 lg:text-[20px]">
          Pursuit racing for every runner
        </p>
        <div className="flex w-full max-w-[360px] flex-row flex-wrap justify-center gap-2 lg:flex-col lg:gap-3.5">
          {[
            "400% more participation",
            "£1,000 avg school return",
            "99 levels of competition",
          ].map((stat) => (
            <div
              key={stat}
              className="rounded-full px-3 py-1.5 text-center text-[11px] font-semibold backdrop-blur-sm lg:px-6 lg:py-3 lg:text-[15px]"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "2px solid rgba(255,255,255,0.6)",
              }}
            >
              {stat}
            </div>
          ))}
        </div>
      </section>

      {/* ── Right: form pane ─────────────────────────────────────────────── */}
      <section
        className="flex flex-col items-center justify-center px-4 py-6 lg:flex-1 lg:px-12 lg:py-12"
        style={{ background: "var(--background)" }}
      >
        <div className="w-full max-w-[400px]">{children}</div>
        <p
          className="mt-6 text-center text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          Confidential · UK GDPR compliant · eu-west-2 (London)
        </p>
      </section>
    </main>
  );
}
