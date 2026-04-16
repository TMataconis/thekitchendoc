"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export async function deleteRecipe(id) {
  try {
    await verifyAdmin();
    await prisma.$transaction(async (tx) => {
      // Variations don't cascade from their parent — delete them first
      await tx.recipe.deleteMany({ where: { parentRecipeId: id } });
      await tx.recipe.delete({ where: { id } });
    });
    revalidatePath("/admin/recipes");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}
