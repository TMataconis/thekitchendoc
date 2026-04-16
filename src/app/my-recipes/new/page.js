import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NewRecipeForm from "./NewRecipeForm";

export const metadata = {
  title: "New Recipe — The Kitchen Doc",
};

export default async function NewRecipePage() {
  const [session, categories] = await Promise.all([
    auth(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const isAdmin = session?.user?.role === "ADMIN";

  return <NewRecipeForm categories={categories} isAdmin={isAdmin} />;
}
