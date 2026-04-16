import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import SearchForm from "./SearchForm";

export const metadata = {
  title: "Search — The Kitchen Doc",
};

const SOURCE_LABELS = {
  titles: "recipe title",
  ingredients: "ingredients",
  categories: "category",
};

async function runSearch(q, inParam) {
  const sources = (inParam ?? "titles,ingredients,categories")
    .split(",")
    .filter((s) => ["titles", "ingredients", "categories"].includes(s));

  const resultMap = new Map();

  function merge(recipes, source) {
    for (const recipe of recipes) {
      if (resultMap.has(recipe.id)) {
        resultMap.get(recipe.id).matchedIn.push(source);
      } else {
        resultMap.set(recipe.id, { recipe, matchedIn: [source] });
      }
    }
  }

  const base = {
    parentRecipeId: null,
  };

  const include = {
    category: true,
  };

  const [titleResults, ingredientResults, categoryResults] = await Promise.all([
    sources.includes("titles")
      ? prisma.recipe.findMany({
          where: { ...base, title: { contains: q, mode: "insensitive" } },
          include,
          orderBy: { sortOrder: "asc" },
        })
      : [],
    sources.includes("ingredients")
      ? prisma.recipe.findMany({
          where: {
            ...base,
            ingredientGroups: {
              some: {
                ingredients: {
                  some: { name: { contains: q, mode: "insensitive" } },
                },
              },
            },
          },
          include,
          orderBy: { sortOrder: "asc" },
        })
      : [],
    sources.includes("categories")
      ? prisma.recipe.findMany({
          where: {
            ...base,
            category: { name: { contains: q, mode: "insensitive" } },
          },
          include,
          orderBy: { sortOrder: "asc" },
        })
      : [],
  ]);

  merge(titleResults, "titles");
  merge(ingredientResults, "ingredients");
  merge(categoryResults, "categories");

  return [...resultMap.values()];
}

export default async function SearchPage({ searchParams }) {
  const { q, in: inParam } = await searchParams;
  const query = q?.trim() ?? "";
  const hasSearch = query.length > 0;

  const results = hasSearch ? await runSearch(query, inParam) : [];

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight text-stone-800 hover:text-amber-700 transition-colors"
            >
              The Kitchen Doc
            </Link>
            <span className="text-stone-400 text-sm">/</span>
            <span className="text-sm text-stone-400">Search</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight mb-6">
            Search
          </h1>
          {/* Suspense required because SearchForm uses useSearchParams */}
          <Suspense>
            <SearchForm />
          </Suspense>
        </div>

        {!hasSearch && (
          <div className="rounded-2xl border border-amber-100 bg-white px-8 py-12 text-center shadow-sm">
            <span className="text-4xl">🔍</span>
            <p className="mt-4 text-stone-500">
              Enter a search term above to find recipes.
            </p>
          </div>
        )}

        {hasSearch && results.length === 0 && (
          <div className="rounded-2xl border border-amber-100 bg-white px-8 py-12 text-center shadow-sm">
            <span className="text-4xl">🍽️</span>
            <p className="mt-4 font-medium text-stone-700">
              No results for &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1 text-sm text-stone-400">
              Try different keywords or check more filter options.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <p className="mb-5 text-sm text-stone-500">
              {results.length} result{results.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-stone-700">
                &ldquo;{query}&rdquo;
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {results.map(({ recipe, matchedIn }) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="group block rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200"
                >
                  <div className="p-6">
                    <h2 className="text-base font-semibold text-stone-800 group-hover:text-amber-700 transition-colors duration-200 leading-snug">
                      {recipe.title}
                    </h2>

                    <p className="mt-1 text-xs text-stone-400">
                      {recipe.category.name}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.servings && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
                          {recipe.servings}
                        </span>
                      )}
                      {matchedIn.map((source) => (
                        <span
                          key={source}
                          className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs text-stone-500"
                        >
                          matched in: {SOURCE_LABELS[source]}
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
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 mt-8 border-t border-amber-100">
        <p className="text-xs text-stone-400">The Kitchen Doc</p>
      </footer>
    </div>
  );
}
