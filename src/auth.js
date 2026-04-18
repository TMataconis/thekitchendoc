import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { createMinimalAdapter } from "@/lib/authAdapter";

async function sendVerificationRequest({ identifier: email, url }) {
  const { Resend: ResendSDK } = await import("resend");
  const resend = new ResendSDK(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
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
        <!-- Header -->
        <tr>
          <td style="background:#fffbeb;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #fde68a;">
            <div style="display:inline-block;width:48px;height:48px;background:#fef3c7;border-radius:12px;font-size:24px;line-height:48px;text-align:center;margin-bottom:12px;">🍳</div>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#1c1917;letter-spacing:-0.3px;">The Kitchen Doc</h1>
          </td>
        </tr>
        <!-- Body -->
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
        <!-- Footer -->
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
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createMinimalAdapter(),
  session: { strategy: "jwt" },

  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Resend({
      from: process.env.EMAIL_FROM,
      sendVerificationRequest,
    }),
  ],

  callbacks: {
    async signIn({ account }) {
      // Adapter handles user creation; just gate on allowed providers
      return ["github", "google", "resend"].includes(account?.provider);
    },

    async jwt({ token, account }) {
      if (account) {
        // account is only present on sign-in; look up the DB user once to
        // embed id and role into the token for all subsequent requests
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.realRole = token.role; // always the real DB role

      // Apply role preview for ADMINs — read cookie at request time
      let previewRole = null;
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const raw = cookieStore.get("role_preview")?.value;
        if (token.role === "ADMIN" && ["CONTRIBUTOR", "VIEWER"].includes(raw)) {
          previewRole = raw;
        }
      } catch {
        // cookies() unavailable in Edge runtime — fall back to real role
      }

      session.user.role = previewRole ?? token.role;
      return session;
    },
  },
});
