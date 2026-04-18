import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return {};
  return { title: `#${tag.name} — The Kitchen Doc` };
}

export default async function TagPage({ params }) {
  const { slug } = await params;

  const [session, tag] = await Promise.all([
    auth(),
    prisma.tag.findUnique({
      where: { slug },
      include: {
        recipes: {
          where: { parentRecipeId: null },
          orderBy: { sortOrder: "asc" },
          include: {
            category: true,
            _count: { select: { variations: true } },
          },
        },
      },
    }),
  ]);

  if (!tag) notFound();

  const recipes = tag.recipes;

  return (
    <div className="min-h-screen bg-amber-50">
      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-10">
          <nav className="mb-3">
            <Link href="/tags" className="text-sm text-amber-600 hover:text-amber-700 transition-colors">
              ← All Tags
            </Link>
          </nav>
          <div className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-sm font-medium text-amber-700 mb-4">
            tag
          </div>
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
            {tag.name}
          </h1>
          <p className="mt-2 text-stone-500">
            {recipes.length === 0
              ? "No recipes with this tag yet."
              : `${recipes.length} recipe${recipes.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {recipes.length === 0 ? (
          <p className="text-stone-400 italic">Nothing here yet.</p>
        ) : !session ? (
          /* Locked state for unauthenticated visitors */
          <div className="rounded-2xl border border-amber-100 bg-white px-8 py-14 text-center shadow-sm">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-amber-600"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-stone-800">
              Sign in to view these recipes
            </h2>
            <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto">
              These recipes are part of a private collection. Sign in to browse
              them.
            </p>
            <Link
              href={`/api/auth/signin?callbackUrl=/tags/${slug}`}
              className="mt-6 inline-flex items-center rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group block rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200"
              >
                <div className="p-7">
                  <p className="text-xs text-stone-400 mb-1">
                    {recipe.category.name}
                  </p>
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
