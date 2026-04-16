import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Favorites — The Kitchen Doc",
};

export default async function FavoritesPage() {
  const session = await auth();
  const userId = session.user.id;

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      recipe: {
        include: {
          category: true,
          tags: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-8">
        Favorites
      </h1>

      {favorites.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-8 py-14 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-400"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <p className="text-stone-500">No favorites yet.</p>
          <p className="mt-1 text-sm text-stone-400">
            Open any recipe and tap the heart to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {favorites.map(({ recipe }) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group block rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200"
            >
              <div className="p-6">
                <p className="text-xs text-stone-400 mb-1">
                  {recipe.category.name}
                </p>
                <h2 className="text-base font-semibold text-stone-800 group-hover:text-amber-700 transition-colors duration-200 leading-snug">
                  {recipe.title}
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  {recipe.servings && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
                      {recipe.servings}
                    </span>
                  )}
                  {recipe.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs text-stone-500"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm text-stone-400 group-hover:text-stone-500 transition-colors duration-200">
                  View recipe →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
