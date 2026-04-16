"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(recipeId) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const userId = session.user.id;

  const existing = await prisma.favorite.findUnique({
    where: { userId_recipeId: { userId, recipeId } },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: { userId_recipeId: { userId, recipeId } },
    });
  } else {
    await prisma.favorite.create({
      data: { userId, recipeId },
    });
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/my-recipes/favorites");

  return { favorited: !existing };
}
