import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestedRole, message } = await request.json();
  if (!["CONTRIBUTOR", "ADMIN"].includes(requestedRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Block if there is already a pending request
  const existing = await prisma.roleRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a pending request" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const roleRequest = await prisma.roleRequest.create({
    data: {
      userId: user.id,
      requestedRole,
      message: message?.trim() || null,
      status: "PENDING",
    },
  });

  // Notify admin
  await resend.emails.send({
    from: "noreply@thekitchendoc.com",
    to: ADMIN_EMAIL,
    subject: `New role request from ${user.name ?? user.email}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #fde68a;overflow:hidden;">
        <tr>
          <td style="background:#fffbeb;padding:24px 40px;text-align:center;border-bottom:1px solid #fde68a;">
            <h1 style="margin:0;font-size:18px;font-weight:700;color:#1c1917;">New Role Request — The Kitchen Doc</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:14px;color:#78716c;">Name</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#1c1917;">${user.name ?? "—"}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#78716c;">Email</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#1c1917;">${user.email}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#78716c;">Current role</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#1c1917;">${user.role}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#78716c;">Requested role</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#d97706;">${requestedRole}</td></tr>
              ${message ? `<tr><td colspan="2" style="padding:16px 0 0;font-size:14px;color:#44403c;"><strong>Message:</strong><br/>${message}</td></tr>` : ""}
            </table>
            <div style="margin-top:24px;">
              <a href="${process.env.NEXTAUTH_URL}/admin/requests" style="display:inline-block;background:#d97706;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
                Review in Admin
              </a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }).catch(() => {}); // don't fail the request if email fails

  return NextResponse.json({ success: true, id: roleRequest.id });
}

export async function GET() {
  const session = await auth();
  const realRole = session?.user?.realRole ?? session?.user?.role;
  if (realRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.roleRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return NextResponse.json(requests);
}
