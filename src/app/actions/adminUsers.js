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
  return session;
}

const ROLES = ["ADMIN", "CONTRIBUTOR", "VIEWER"];

export async function updateUserRole(userId, role) {
  try {
    const session = await verifyAdmin();
    if (session.user.id === userId) {
      return { error: "You cannot change your own role." };
    }
    if (!ROLES.includes(role)) {
      return { error: "Invalid role." };
    }
    const user = await prisma.user.update({ where: { id: userId }, data: { role } });
    revalidatePath("/admin/users");
    return { user };
  } catch (err) {
    return { error: err.message };
  }
}
