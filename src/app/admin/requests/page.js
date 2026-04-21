import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RequestsManager from "./RequestsManager";

export const metadata = {
  title: "Role Requests — Admin — The Kitchen Doc",
};

export default async function RequestsPage() {
  const session = await auth();
  const realRole = session?.user?.realRole ?? session?.user?.role;
  if (realRole !== "ADMIN") redirect("/");

  const requests = await prisma.roleRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Role Requests</h1>
        <p className="mt-1 text-sm text-stone-500">Review and act on user access requests.</p>
      </div>

      <RequestsManager initialRequests={requests} />
    </div>
  );
}
