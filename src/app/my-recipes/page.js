import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "My Dashboard — The Kitchen Doc",
};

export default async function MyRecipesDashboard() {
  const session = await auth();
  const userId = session.user.id;

  // VIEWERs have no dashboard — send them to their favorites
  if (session.user.role === "VIEWER") {
    redirect("/my-recipes/favorites");
  }

  const [recipeCount, favoriteCount, recipes] = await Promise.all([
    prisma.recipe.count({
      where: { createdById: userId, parentRecipeId: null },
    }),
    prisma.favorite.count({ where: { userId } }),
    prisma.recipe.findMany({
      where: { createdById: userId, parentRecipeId: null },
      orderBy: { id: "desc" },
      select: {
        id: true,
        title: true,
        category: { select: { name: true } },
        _count: { select: { variations: true } },
      },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
          My Dashboard
        </h1>
        <Link
          href="/my-recipes/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          <span className="text-base leading-none">✚</span>
          Create New Recipe
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
            Recipes Created
          </p>
          <p className="text-3xl font-bold text-stone-800 tabular-nums">
            {recipeCount}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
            Favorited
          </p>
          <p className="text-3xl font-bold text-stone-800 tabular-nums">
            {favoriteCount}
          </p>
        </div>
      </div>

      {/* Recipe list */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 mb-4">
          Your recipes
        </h2>

        {recipes.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-8 py-12 text-center">
            <p className="text-stone-500 mb-4">You haven&apos;t added any recipes yet.</p>
            <Link
              href="/my-recipes/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              <span className="text-base leading-none">✚</span>
              Create your first recipe
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {recipe.title}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {recipe.category.name}
                    {recipe._count.variations > 0 && (
                      <span className="ml-2">
                        · {recipe._count.variations} variation{recipe._count.variations === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="text-xs text-stone-400 hover:text-amber-700 transition-colors"
                  >
                    View
                  </Link>
                  <span className="text-stone-200">·</span>
                  <Link
                    href={`/my-recipes/${recipe.id}/edit`}
                    className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
