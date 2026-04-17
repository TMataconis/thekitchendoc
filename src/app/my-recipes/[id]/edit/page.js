import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EditRecipePage from "./EditRecipePage";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  if (!recipe) return {};
  return { title: `Edit: ${recipe.title} — The Kitchen Doc` };
}

export default async function EditPage({ params }) {
  const { id } = await params;
  const recipeId = Number(id);

  const [session, recipe, categories] = await Promise.all([
    auth(),
    prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        tags: { orderBy: { name: "asc" } },
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
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!recipe) notFound();

  const { role, id: userId } = session.user;

  // Contributors can only edit their own recipes
  if (role === "CONTRIBUTOR" && recipe.createdById !== userId) {
    redirect("/my-recipes");
  }

  // Transform DB shape → form shape
  const initial = {
    title: recipe.title,
    servings: recipe.servings,
    notes: recipe.notes,
    imageUrl: recipe.imageUrl ?? "",
    categoryId: String(recipe.categoryId),
    tags: recipe.tags.map((t) => t.name),
    ingredientGroups: recipe.ingredientGroups.map((g) => ({
      name: g.name,
      ingredients: g.ingredients.map((ing) => ({
        amount: ing.amount,
        unit: ing.unit,
        name: ing.name,
        note: ing.note,
      })),
    })),
    instructionGroups: recipe.instructionGroups.map((g) => ({
      name: g.name,
      // top-level instructions only; each already has subSteps populated
      instructions: g.instructions
        .filter((i) => i.parentInstructionId === null)
        .map((inst) => ({
          text: inst.text,
          subSteps: inst.subSteps.map((s) => ({
            label: s.stepLabel,
            text: s.text,
          })),
        })),
    })),
  };

  const canDelete =
    role === "ADMIN" ||
    (role === "CONTRIBUTOR" && recipe.createdById === userId);

  return (
    <EditRecipePage
      recipeId={recipeId}
      initial={initial}
      categories={categories}
      canDelete={canDelete}
    />
  );
}
