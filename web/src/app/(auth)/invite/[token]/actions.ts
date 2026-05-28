"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InviteAcceptState = { error?: string };

export async function acceptInviteAction(
  _prev: InviteAcceptState | undefined,
  formData: FormData,
): Promise<InviteAcceptState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();

  if (!token) return { error: "Missing token." };
  if (password.length < 12)
    return { error: "Password must be at least 12 characters." };
  if (!full_name) return { error: "Please enter your full name." };

  const admin = createAdminClient();

  // Re-validate token server-side.
  const { data: invite, error: lookupErr } = await admin
    .from("invitations")
    .select("id, email, invited_role, organisation_id, status, expires_at, group_assignments")
    .eq("token", token)
    .single();

  if (lookupErr || !invite) return { error: "Invalid invitation link." };
  if (invite.status !== "sent")
    return { error: `Invitation already ${invite.status}.` };
  if (new Date(invite.expires_at) < new Date())
    return { error: "Invitation has expired. Ask the inviter to resend." };

  // Create the auth user with the invited email.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createErr || !created.user) {
    console.error("[invite] createUser error:", createErr);
    return { error: createErr?.message ?? "Could not create account." };
  }

  // Update the auto-created profile with the role + org from the invite.
  await admin
    .from("profiles")
    .update({
      role: invite.invited_role,
      organisation_id: invite.organisation_id,
      full_name,
    })
    .eq("id", created.user.id);

  // For Lead invites, attach the group assignments.
  if (invite.invited_role === "lead" && invite.group_assignments?.length) {
    await admin.from("group_leads").insert(
      invite.group_assignments.map((group_id: string) => ({
        group_id,
        lead_id: created.user!.id,
      })),
    );
  }

  // Mark the invitation accepted.
  await admin
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: created.user.id,
    })
    .eq("id", invite.id);

  // Now sign the new user in with the password they just set so the proxy
  // can move them onward to 2FA enrolment.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });

  if (signInErr) {
    // Account was created successfully, just sign-in failed. Send them to login.
    return { error: "Account created. Please sign in to continue." };
  }

  // Proxy will redirect to /two-factor/enrol (AAL1 session, no factor yet).
  redirect("/dashboard");
}
