import { CarrotMark } from "@/components/ui/carrot-mark";

/**
 * Layout for unauthenticated / auth-challenge pages.
 * Centred card with the Carrot Chase wordmark above. Background uses the warm
 * cream + subtle orange wash from the prototype gate screen.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(145deg,#FEF0E7_0%,#FAF6F1_55%,#F0E8DF_100%)] px-4 py-12">
      {/* decorative blobs from the prototype gate */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[rgba(232,82,10,0.07)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-[rgba(232,82,10,0.05)]"
      />

      <div className="mb-7 flex flex-col items-center">
        <CarrotMark size="lg" showWordmark={false} />
        <span className="mt-3 text-[26px] font-extrabold tracking-tight text-[color:var(--foreground)]">
          Carrot Chase
        </span>
        <span className="mt-1 text-sm text-[color:var(--muted)]">
          Race Management Platform
        </span>
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-[color:var(--border)] bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
        {children}
      </div>

      <p className="relative mt-6 text-center text-xs text-[color:var(--muted)]">
        Confidential &middot; UK GDPR compliant &middot; eu-west-2 (London)
      </p>
    </main>
  );
}
