import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Dashboard — Admin — The Kitchen Doc",
};

export default async function AdminDashboard() {
  const [
    recipeCount,
    categoryCount,
    usersByRole,
    recentRecipes,
  ] = await Promise.all([
    prisma.recipe.count({ where: { parentRecipeId: null } }),
    prisma.category.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.recipe.findMany({
      where: { parentRecipeId: null },
      orderBy: { id: "desc" },
      take: 5,
      select: { id: true, title: true, category: { select: { name: true } } },
    }),
  ]);

  const roleCounts = Object.fromEntries(
    usersByRole.map(({ role, _count }) => [role, _count._all])
  );
  const totalUsers = usersByRole.reduce((sum, r) => sum + r._count._all, 0);

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-8">
        Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Recipes" value={recipeCount} />
        <StatCard label="Categories" value={categoryCount} />
        <StatCard label="Users" value={totalUsers} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Users by role */}
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Users by role
          </h2>
          <ul className="space-y-2">
            {(["ADMIN", "CONTRIBUTOR", "VIEWER"]).map((role) => (
              <li key={role} className="flex items-center justify-between">
                <span className="text-sm text-stone-600">{capitalize(role)}</span>
                <span className="text-sm font-semibold text-stone-800 tabular-nums">
                  {roleCounts[role] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Recently added */}
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Recently added
          </h2>
          {recentRecipes.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No recipes yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentRecipes.map((recipe) => (
                <li key={recipe.id} className="flex items-start justify-between gap-3">
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="text-sm text-stone-700 hover:text-amber-700 transition-colors leading-snug"
                  >
                    {recipe.title}
                  </Link>
                  <span className="flex-shrink-0 text-xs text-stone-400 mt-0.5">
                    {recipe.category.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-6 py-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-stone-800 tabular-nums">{value}</p>
    </div>
  );
}

function capitalize(str) {
  return str.charAt(0) + str.slice(1).toLowerCase();
}
