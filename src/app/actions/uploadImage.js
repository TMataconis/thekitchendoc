"use server";

import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = "recipe-images";

function ext(mimeType) {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mimeType];
}

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uploadImage(formData) {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };
  const { role } = session.user;
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") {
    return { error: "Insufficient permissions." };
  }

  const file = formData.get("image");
  if (!file || typeof file === "string") return { error: "No file provided." };

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, and WebP images are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be under 5 MB." };
  }

  const recipeSlug = formData.get("recipeSlug") ?? "recipe";
  const filename = `${toSlug(String(recipeSlug))}-${Date.now()}.${ext(file.type)}`;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return { error: "Upload failed. Please try again." };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return { url: data.publicUrl };
}
