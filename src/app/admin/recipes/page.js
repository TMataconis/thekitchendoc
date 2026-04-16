import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RecipesTable from "./RecipesTable";

export const metadata = {
  title: "All Recipes — Admin — The Kitchen Doc",
};

export default async function AdminRecipesPage() {
  const recipes = await prisma.recipe.findMany({
    where: { parentRecipeId: null },
    orderBy: { id: "desc" },
    select: {
      id: true,
      title: true,
      servings: true,
      category: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
          All Recipes
        </h1>
        <Link
          href="/my-recipes/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Recipe
        </Link>
      </div>

      <RecipesTable recipes={recipes} />
    </div>
  );
}
