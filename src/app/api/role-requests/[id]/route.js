import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function PATCH(request, { params }) {
  const session = await auth();
  const realRole = session?.user?.realRole ?? session?.user?.role;
  if (realRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status, adminComment } = await request.json();

  if (!["APPROVED", "DENIED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const roleRequest = await prisma.roleRequest.findUnique({
    where: { id: Number(id) },
    include: { user: true },
  });
  if (!roleRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update the request
  const updated = await prisma.roleRequest.update({
    where: { id: Number(id) },
    data: { status, adminComment: adminComment?.trim() || null },
  });

  // Promote the user if approved
  if (status === "APPROVED") {
    await prisma.user.update({
      where: { id: roleRequest.userId },
      data: { role: roleRequest.requestedRole },
    });
  }

  // Email the requesting user
  const userName = roleRequest.user.name ?? roleRequest.user.email;
  const approved = status === "APPROVED";
  await resend.emails.send({
    from: "noreply@thekitchendoc.com",
    to: roleRequest.user.email,
    subject: `Your role request has been ${approved ? "approved" : "denied"}`,
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
            <div style="font-size:24px;margin-bottom:8px;">${approved ? "✅" : "❌"}</div>
            <h1 style="margin:0;font-size:18px;font-weight:700;color:#1c1917;">
              Role Request ${approved ? "Approved" : "Denied"}
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:15px;color:#44403c;">Hi ${userName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#44403c;">
              Your request to become a <strong>${roleRequest.requestedRole}</strong> on The Kitchen Doc has been <strong>${status.toLowerCase()}</strong>.
            </p>
            ${approved ? `<p style="margin:0 0 16px;font-size:15px;color:#44403c;">Your role has been updated. Sign out and back in to see the changes.</p>` : ""}
            ${adminComment ? `<div style="margin:16px 0;padding:16px;background:#f5f5f4;border-radius:8px;font-size:14px;color:#44403c;"><strong>Admin note:</strong><br/>${adminComment}</div>` : ""}
            <div style="margin-top:24px;">
              <a href="${process.env.NEXTAUTH_URL}" style="display:inline-block;background:#d97706;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
                Go to The Kitchen Doc
              </a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }).catch(() => {});

  return NextResponse.json(updated);
}
