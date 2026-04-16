import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UsersTable from "./UsersTable";

export const metadata = {
  title: "Users — Admin — The Kitchen Doc",
};

export default async function AdminUsersPage() {
  const [session, raw] = await Promise.all([
    auth(),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { recipes: true } } },
    }),
  ]);

  const users = raw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    recipeCount: u._count.recipes,
  }));

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-8">
        Users
      </h1>
      <UsersTable users={users} currentUserId={session.user.id} />
    </div>
  );
}
