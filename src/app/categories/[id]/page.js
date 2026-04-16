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
    include: { _count: { select: { variations: true } } },
  });

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-baseline gap-3">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-stone-800 hover:text-amber-700 transition-colors"
          >
            The Kitchen Doc
          </Link>
          <span className="text-stone-400 text-sm">/</span>
          <span className="text-stone-500 text-sm">{category.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
            {category.name}
          </h1>
          <p className="mt-2 text-stone-500">
            {recipes.length === 0
              ? "No recipes yet."
              : `${recipes.length} recipe${recipes.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {recipes.length === 0 ? (
          <p className="text-stone-400 italic">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group block rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200"
              >
                <div className="p-7">
                  <h2 className="text-lg font-semibold text-stone-800 group-hover:text-amber-700 transition-colors duration-200 leading-snug">
                    {recipe.title}
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipe.servings && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
                        {recipe.servings}
                      </span>
                    )}
                    {recipe._count.variations > 0 && (
                      <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs text-stone-500">
                        {recipe._count.variations} variation{recipe._count.variations === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-stone-400 group-hover:text-stone-500 transition-colors duration-200">
                    View recipe →
                  </p>
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
