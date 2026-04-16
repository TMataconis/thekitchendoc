import { prisma } from "@/lib/prisma";
import CategoriesManager from "./CategoriesManager";

export const metadata = {
  title: "Categories — Admin — The Kitchen Doc",
};

export default async function AdminCategoriesPage() {
  const raw = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { recipes: true } } },
  });

  const categories = raw.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    recipeCount: c._count.recipes,
  }));

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-8">
        Categories
      </h1>
      <CategoriesManager categories={categories} />
    </div>
  );
}
