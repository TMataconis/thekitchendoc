"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteMyRecipe(id) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Not authenticated");

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!recipe) throw new Error("Recipe not found");

    const { role, id: userId } = session.user;
    if (role !== "ADMIN" && recipe.createdById !== userId) {
      throw new Error("Forbidden");
    }

    await prisma.$transaction(async (tx) => {
      await tx.recipe.deleteMany({ where: { parentRecipeId: id } });
      await tx.recipe.delete({ where: { id } });
    });

    revalidatePath("/my-recipes/recipes");
    revalidatePath("/my-recipes");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}
