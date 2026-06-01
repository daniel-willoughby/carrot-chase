/**
 * Send an invitation email via Resend.
 *
 * Called from server actions only — never from the browser.
 * Failures are returned as { error } rather than thrown so the caller can
 * decide whether to surface them (the invitation row is always written first).
 *
 * Template is plain HTML inline-styled for maximum email-client compat.
 * The invite link points to /invite/[token] where the recipient sets their
 * password and is signed in automatically.
 */

import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function sendInviteEmail(args: {
  to: string;
  orgName: string;
  role: string;
  token: string;
  expiresHours?: number;
}): Promise<{ error?: string }> {
  const { to, orgName, role, token, expiresHours = 72 } = args;

  // Instantiate lazily inside the function — the Resend constructor THROWS
  // synchronously on a missing/empty key. Doing it at module top-level would
  // crash any worker that merely imports this module (e.g. Next's build-time
  // "Collecting page data" phase), deadlocking the build. Degrade gracefully
  // instead: no key → return a warning the caller surfaces in the UI.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { error: "Email not configured (RESEND_API_KEY missing)." };
  }
  const resend = new Resend(apiKey);

  const inviteUrl = `${SITE_URL}/invite/${token}`;
  const roleLabel =
    role === "lead" ? "Group Lead"
    : role === "school_admin" ? "School Admin"
    : role === "super_admin" ? "Super Admin"
    : role;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#e8520a,#f97316);padding:32px 40px;text-align:center;">
            <span style="font-size:40px;">🥕</span>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
              Carrot Chase
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111111;">
              You&rsquo;ve been invited
            </h2>
            <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
              You&rsquo;ve been invited to join <strong style="color:#111111;">${orgName}</strong>
              as a <strong style="color:#e8520a;">${roleLabel}</strong> on Carrot Chase.
            </p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:linear-gradient(135deg,#e8520a,#f97316);border-radius:999px;">
                  <a href="${inviteUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                    Accept invitation →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#888888;">
              Or copy this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:12px;color:#aaaaaa;word-break:break-all;">
              ${inviteUrl}
            </p>

            <hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0;">

            <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.5;">
              This invitation expires in <strong>${expiresHours} hours</strong>.
              If you weren&rsquo;t expecting this email you can safely ignore it.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:12px;color:#cccccc;">
              Carrot Chase &mdash; Gamified running for primary schools
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `You've been invited to join ${orgName} as a ${roleLabel} on Carrot Chase.\n\nAccept your invitation here:\n${inviteUrl}\n\nThis link expires in ${expiresHours} hours.\n\nIf you weren't expecting this email you can safely ignore it.`;

  try {
    const { error } = await resend.emails.send({
      from: `Carrot Chase <${FROM}>`,
      to,
      subject: `You're invited to join ${orgName} on Carrot Chase`,
      html,
      text,
    });

    if (error) {
      console.warn("[resend] send error:", error);
      return { error: (error as { message?: string }).message ?? "Email send failed." };
    }

    return {};
  } catch (err) {
    console.warn("[resend] threw:", err instanceof Error ? err.message : String(err));
    return { error: "Email could not be sent." };
  }
}
