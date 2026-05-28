import Link from "next/link";
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

  if (invalid) {
    return (
      <div className="text-center">
        <h2 className="text-[22px] font-extrabold tracking-tight">
          Invitation invalid
        </h2>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--muted)" }}
        >
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
          className="mt-5 inline-block text-sm font-semibold"
          style={{ color: "var(--orange)" }}
        >
          Go to sign in →
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
        You&apos;re invited
      </h2>
      <p
        className="mb-6 mt-1.5 text-sm"
        style={{ color: "var(--muted)" }}
      >
        You&apos;ve been invited to join{" "}
        <span
          className="font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {invite!.organisations?.name ?? "Carrot Chase"}
        </span>{" "}
        as a{" "}
        <span className="font-semibold" style={{ color: "var(--orange)" }}>
          {ROLE_LABEL[invite!.invited_role] ?? invite!.invited_role}
        </span>
        .
      </p>

      <AcceptInviteForm token={token} email={invite!.email} />
    </>
  );
}
