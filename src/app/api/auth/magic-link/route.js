import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Overwrite any existing token for this email
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: email, token: "" } },
    update: { token, expires },
    create: { identifier: email, token, expires },
  }).catch(async () => {
    // upsert on compound key requires the exact token — just delete old and insert
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({ data: { identifier: email, token, expires } });
  });

  const url = `${process.env.NEXTAUTH_URL}/api/auth/magic-link/verify?token=${token}&email=${encodeURIComponent(email)}`;

  await resend.emails.send({
    from: "noreply@thekitchendoc.com",
    to: email,
    subject: "Your sign-in link for The Kitchen Doc",
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #fde68a;overflow:hidden;">
        <tr>
          <td style="background:#fffbeb;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #fde68a;">
            <div style="display:inline-block;width:48px;height:48px;background:#fef3c7;border-radius:12px;font-size:24px;line-height:48px;text-align:center;margin-bottom:12px;">🍳</div>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#1c1917;letter-spacing:-0.3px;">The Kitchen Doc</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 8px;font-size:15px;color:#44403c;line-height:1.5;">Hello,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#44403c;line-height:1.5;">
              Click the button below to sign in to your account. This link expires in 24 hours and can only be used once.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${url}" style="display:inline-block;background:#d97706;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.1px;">
                    Sign in to The Kitchen Doc
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;color:#78716c;line-height:1.5;">
              If you didn't request this email you can safely ignore it.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #f5f5f4;">
            <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;">The Kitchen Doc</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  return NextResponse.json({ success: true });
}
