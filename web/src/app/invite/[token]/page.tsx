import Link from "next/link";
import { CarrotMark } from "@/components/ui/carrot-mark";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInviteForm } from "./form";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  lead: "Lead",
  parent: "Parent",
};

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  // Look up the invitation by token using service role (bypasses RLS so
  // the invitee, who is not yet authenticated, can read it).
  const { data: invite } = await admin
    .from("invitations")
    .select("email, invited_role, status, expires_at, organisations(name)")
    .eq("token", token)
    .single();

  const expired = invite && new Date(invite.expires_at) < new Date();
  const invalid = !invite || invite.status !== "sent" || expired;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(145deg,#FEF0E7_0%,#FAF6F1_55%,#F0E8DF_100%)] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[rgba(232,82,10,0.07)]"
      />

      <div className="mb-7 flex flex-col items-center">
        <CarrotMark size="lg" showWordmark={false} />
        <span className="mt-3 text-[26px] font-extrabold tracking-tight">
          Carrot Chase
        </span>
        <span className="mt-1 text-sm text-[color:var(--muted)]">
          Race Management Platform
        </span>
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-[color:var(--border)] bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
        {invalid ? (
          <div className="text-center">
            <h1 className="text-xl font-bold">Invitation invalid</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {!invite
                ? "We couldn't find this invitation. Check the link and try again."
                : invite.status === "accepted"
                  ? "This invitation has already been accepted. Sign in to continue."
                  : expired
                    ? "This invitation expired. Ask the inviter to resend it."
                    : "This invitation is no longer valid."}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-semibold text-[color:var(--orange)] hover:underline"
            >
              Go to sign in →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">
              You&apos;re invited
            </h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              You&apos;ve been invited to join{" "}
              <span className="font-semibold text-[color:var(--foreground)]">
                {invite.organisations?.name ?? "Carrot Chase"}
              </span>{" "}
              as a{" "}
              <span className="font-semibold text-[color:var(--orange)]">
                {ROLE_LABEL[invite.invited_role] ?? invite.invited_role}
              </span>
              . Set up your account below.
            </p>

            <AcceptInviteForm token={token} email={invite.email} />
          </>
        )}
      </div>

      <p className="relative mt-6 text-center text-xs text-[color:var(--muted)]">
        Confidential &middot; UK GDPR compliant &middot; eu-west-2 (London)
      </p>
    </main>
  );
}
