import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id: Number(id) } });
  if (!category) return {};
  return { title: `${category.name} — The Kitchen Doc` };
}

export default async function CategoryPage({ params }) {
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id: Number(id) },
  });

  if (!category) notFound();

  const recipes = await prisma.recipe.findMany({
    where: { categoryId: category.id },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      servings: true,
      parentRecipeId: true,
      parentRecipe: { select: { title: true } },
    },
  });

  // Group variations under their parents, maintaining sortOrder within each group
  const parents = recipes.filter((r) => !r.parentRecipeId);
  const variationsByParent = recipes
    .filter((r) => r.parentRecipeId)
    .reduce((acc, r) => {
      (acc[r.parentRecipeId] ??= []).push(r);
      return acc;
    }, {});
  const sorted = parents.flatMap((p) => [p, ...(variationsByParent[p.id] ?? [])]);

  return (
    <div className="min-h-screen bg-amber-50">
      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-10">
          <nav className="mb-3">
            <Link href="/" className="text-sm text-amber-600 hover:text-amber-700 transition-colors">
              ← Home
            </Link>
          </nav>
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
            {category.name}
          </h1>
          <p className="mt-2 text-stone-500">
            {sorted.length === 0
              ? "No recipes yet."
              : `${sorted.length} recipe${sorted.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {sorted.length === 0 ? (
          <p className="text-stone-400 italic">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group block rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 overflow-hidden"
              >
                {/* Image */}
                <div className="aspect-video w-full overflow-hidden">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                      <span className="text-3xl opacity-30">🍽️</span>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-stone-800 group-hover:text-amber-700 transition-colors leading-snug">
                    {recipe.title}
                  </p>
                  {recipe.servings && (
                    <p className="mt-0.5 text-xs text-stone-400">{recipe.servings}</p>
                  )}
                  {recipe.parentRecipeId && recipe.parentRecipe && (
                    <p className="mt-1 text-xs text-stone-400 italic">
                      Variation of {recipe.parentRecipe.title}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-8 mt-8 border-t border-amber-100">
        <p className="text-xs text-stone-400">The Kitchen Doc</p>
      </footer>
    </div>
  );
}
