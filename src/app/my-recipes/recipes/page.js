import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RecipeGrid from "./RecipeGrid";

export const metadata = {
  title: "My Recipes — The Kitchen Doc",
};

export default async function MyRecipesListPage() {
  const session = await auth();
  const userId = session.user.id;

  const recipes = await prisma.recipe.findMany({
    where: { createdById: userId, parentRecipeId: null },
    orderBy: { id: "desc" },
    include: {
      category: true,
      tags: { orderBy: { name: "asc" } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
          My Recipes
        </h1>
        <Link
          href="/my-recipes/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          <span className="text-base leading-none">✚</span>
          Create New Recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
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
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
          </div>
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
        <RecipeGrid recipes={recipes} />
      )}
    </div>
  );
}
