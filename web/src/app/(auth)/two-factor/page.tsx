import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyTwoFactorAction } from "./actions";
import { TwoFactorForm } from "./form";

/**
 * 2FA challenge page.
 * - If the user has no verified TOTP factor, send them to /two-factor/enrol.
 * - If they have one, show the 6-digit code entry form.
 */
export default async function TwoFactorPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.find((f) => f.status === "verified");

  if (!totp) redirect("/two-factor/enrol");

  return (
    <div>
      <h1 className="text-xl font-semibold">Two-factor verification</h1>
      <p className="mt-1 text-sm text-[color:var(--muted-fg)]">
        Enter the six-digit code from your authenticator app to continue.
      </p>

      <TwoFactorForm factorId={totp.id} action={verifyTwoFactorAction} />
    </div>
  );
}
