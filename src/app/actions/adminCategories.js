"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

const CategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  sortOrder: z.coerce.number().int().default(0),
});

function revalidate() {
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function createCategory(data) {
  try {
    await verifyAdmin();
    const parsed = CategorySchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.errors[0].message };
    const category = await prisma.category.create({ data: parsed.data });
    revalidate();
    return { category };
  } catch (err) {
    return { error: err.message };
  }
}

export async function updateCategory(id, data) {
  try {
    await verifyAdmin();
    const parsed = CategorySchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.errors[0].message };
    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    revalidate();
    return { category };
  } catch (err) {
    return { error: err.message };
  }
}

export async function reorderCategories(items) {
  try {
    await verifyAdmin();
    // items: [{ id: number, sortOrder: number }]
    await prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        prisma.category.update({ where: { id }, data: { sortOrder } })
      )
    );
    revalidate();
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

export async function deleteCategory(id) {
  try {
    await verifyAdmin();
    const count = await prisma.recipe.count({ where: { categoryId: id } });
    if (count > 0) return { error: "Category has recipes and cannot be deleted." };
    await prisma.category.delete({ where: { id } });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}
