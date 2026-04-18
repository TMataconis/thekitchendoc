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
    where: { categoryId: category.id, parentRecipeId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      isVariation: true,
      parentRecipeId: true,
      servings: true,
      variations: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true },
      },
    },
  });

  const totalCount = recipes.reduce(
    (sum, r) => sum + 1 + r.variations.length,
    0
  );

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
            {totalCount === 0
              ? "No recipes yet."
              : `${totalCount} recipe${totalCount === 1 ? "" : "s"}`}
          </p>
        </div>

        {recipes.length === 0 ? (
          <p className="text-stone-400 italic">Nothing here yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {recipes.map((recipe) => (
              <div key={recipe.id}>
                {/* Parent recipe card */}
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="group flex rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 overflow-hidden"
                >
                  {/* Image panel — full width strip when image exists, thin accent when not */}
                  {recipe.imageUrl ? (
                    <div className="w-1/3 flex-shrink-0 relative min-h-[9rem]">
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-1.5 flex-shrink-0 bg-amber-200" />
                  )}

                  {/* Content */}
                  <div className="flex flex-col justify-center px-6 py-4 min-w-0">
                    <h2 className="text-lg font-semibold text-stone-800 group-hover:text-amber-700 transition-colors duration-200 leading-snug">
                      {recipe.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recipe.servings && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
                          {recipe.servings}
                        </span>
                      )}
                      {recipe.variations.length > 0 && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs text-stone-500">
                          {recipe.variations.length} variation{recipe.variations.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-stone-400 group-hover:text-stone-500 transition-colors">
                      View recipe →
                    </p>
                  </div>
                </Link>

                {/* Variations sub-grid */}
                {recipe.variations.length > 0 && (
                  <div className="mt-3 ml-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {recipe.variations.map((v) => (
                      <Link
                        key={v.id}
                        href={`/recipes/${v.id}`}
                        className="group block rounded-xl bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-stone-700 group-hover:text-amber-700 transition-colors leading-snug">
                          {v.title}
                        </p>
                        <p className="mt-1 text-xs text-stone-400 group-hover:text-stone-500 transition-colors">
                          View recipe →
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
