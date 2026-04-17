"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const VALID_PREVIEWS = ["CONTRIBUTOR", "VIEWER"];

export async function setRolePreview(role) {
  const session = await auth();
  // Must be a real ADMIN (check realRole, not the possibly-previewed role)
  if (!session?.user || session.user.realRole !== "ADMIN") {
    return { error: "Forbidden" };
  }

  const cookieStore = await cookies();

  if (role === null) {
    cookieStore.delete("role_preview");
  } else if (VALID_PREVIEWS.includes(role)) {
    cookieStore.set("role_preview", role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } else {
    return { error: "Invalid role" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
