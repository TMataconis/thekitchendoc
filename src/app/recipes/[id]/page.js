import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RecipeBody from "./RecipeBody";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  if (!recipe) return {};
  return { title: `${recipe.title} — The Kitchen Doc` };
}

export default async function RecipePage({ params }) {
  const { id } = await params;
  const session = await auth();

  // Always fetch the minimal fields needed for both the locked and full views
  const recipe = await prisma.recipe.findUnique({
    where: { id: Number(id) },
    include: {
      category: true,
      tags: { orderBy: { name: "asc" } },
      ...(!session
        ? {}
        : {
            ingredientGroups: {
              orderBy: { sortOrder: "asc" },
              include: { ingredients: { orderBy: { sortOrder: "asc" } } },
            },
            instructionGroups: {
              orderBy: { sortOrder: "asc" },
              include: {
                instructions: {
                  orderBy: { sortOrder: "asc" },
                  include: { subSteps: { orderBy: { sortOrder: "asc" } } },
                },
              },
            },
            variations: {
              orderBy: { sortOrder: "asc" },
              where: { parentRecipeId: Number(id) },
            },
            favorites: {
              where: { userId: session.user.id },
              take: 1,
            },
          }),
    },
  });

  if (!recipe) notFound();

  const isFavorited = session
    ? (recipe.favorites?.length ?? 0) > 0
    : false;

  return (
    <div className="min-h-screen bg-amber-50">
      <main className="max-w-3xl mx-auto px-6 py-14">
        <nav className="mb-6">
          <Link
            href={`/categories/${recipe.category.id}`}
            className="text-sm text-amber-600 hover:text-amber-700 transition-colors"
          >
            ← {recipe.category.name}
          </Link>
        </nav>

        {/* ── Locked state ── */}
        {!session && (
          <div>
            {recipe.imageUrl && (
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full rounded-2xl shadow-sm mb-6 md:float-right md:w-[45%] md:ml-6 md:mb-4"
              />
            )}
            <h1 className="text-4xl font-bold text-stone-800 tracking-tight leading-tight">
              {recipe.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-3 py-1 text-sm text-stone-500">
                {recipe.category.name}
              </span>
              {recipe.servings && (
                <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-sm font-medium text-amber-800">
                  {recipe.servings}
                </span>
              )}
              {recipe.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full bg-white border border-stone-200 px-3 py-1 text-sm text-stone-500"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="clear-both" />

            {/* Lock card */}
            <div className="rounded-2xl border border-amber-100 bg-white px-8 py-14 text-center shadow-sm">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-stone-800">
                Sign in to view this recipe
              </h2>
              <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto">
                This recipe is part of a private collection. Sign in to see
                ingredients and instructions.
              </p>
              <Link
                href={`/api/auth/signin?callbackUrl=/recipes/${recipe.id}`}
                className="mt-6 inline-flex items-center rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        {/* ── Full recipe (authenticated) ── */}
        {session && (
          <RecipeBody
            recipe={recipe}
            isFavorited={isFavorited}
            user={{ id: session.user.id, role: session.user.role }}
          />
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 mt-8 border-t border-amber-100">
        <p className="text-xs text-stone-400">The Kitchen Doc</p>
      </footer>
    </div>
  );
}
