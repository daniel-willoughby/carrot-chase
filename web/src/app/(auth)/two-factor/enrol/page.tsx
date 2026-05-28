import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyEnrolmentAction } from "./actions";
import { EnrolmentForm } from "./form";

/**
 * 2FA enrolment page.
 * Called when an authenticated user has no verified TOTP factor.
 * Shows the QR code + the verification form. Mandatory step on first login.
 */
export default async function TwoFactorEnrolPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Clean up any unverified factors from previous failed attempts.
  // If cleanup fails, we still proceed — the unique friendly name below
  // means a new enroll won't collide regardless.
  const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    console.error("[mfa] listFactors error:", listError);
  }
  for (const f of existing?.all ?? existing?.totp ?? []) {
    if (f.status !== "verified") {
      const { error: unErr } = await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (unErr) console.error("[mfa] unenroll error:", unErr);
    }
  }

  // Millisecond-precision friendly name guarantees no collision even if
  // the page is refreshed rapidly.
  const { data: factor, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Carrot Chase (${Date.now()})`,
  });

  if (error || !factor) {
    console.error("[mfa] enroll error:", error);
    return (
      <div>
        <h1 className="text-xl font-semibold">Two-factor setup failed</h1>
        <p className="mt-2 text-sm text-[color:var(--danger)]">
          {error?.message ?? "Unknown error"}
        </p>
        <p className="mt-3 text-xs text-[color:var(--muted-fg)]">
          Most common cause: TOTP MFA is not enabled on the Supabase project.
          Enable it at <code className="rounded bg-slate-100 px-1">Authentication
          → Multi-Factor Authentication → TOTP (App Authenticator)</code>.
        </p>
      </div>
    );
  }

  // Supabase returns qr_code as a complete `data:image/svg+xml;utf-8,...`
  // URI ready to drop straight into an <img src>.
  return (
    <div>
      <h1 className="text-xl font-semibold">Set up two-factor authentication</h1>
      <p className="mt-1 text-sm text-[color:var(--muted-fg)]">
        Two-factor authentication is mandatory for all Carrot Chase accounts to
        protect children&apos;s data. Use an authenticator app such as 1Password,
        Authy, or Google Authenticator.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-[color:var(--border)] bg-slate-50 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={factor.totp.qr_code}
          alt="2FA QR code"
          width={200}
          height={200}
          className="rounded-md bg-white p-2"
        />
        <details className="w-full text-xs text-[color:var(--muted-fg)]">
          <summary className="cursor-pointer">Can&apos;t scan? Enter the key manually.</summary>
          <code className="mt-2 block break-all rounded bg-white p-2 font-mono text-[11px]">
            {factor.totp.secret}
          </code>
        </details>
      </div>

      <EnrolmentForm factorId={factor.id} action={verifyEnrolmentAction} />
    </div>
  );
}
