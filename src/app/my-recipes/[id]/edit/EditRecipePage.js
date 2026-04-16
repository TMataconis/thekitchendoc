"use client";

import { useRouter } from "next/navigation";
import RecipeEditForm from "@/components/RecipeEditForm";
import { updateRecipe } from "@/app/actions/updateRecipe";

export default function EditRecipePage({ recipeId, initial, categories }) {
  const router = useRouter();

  function handleSave(formData) {
    return updateRecipe(recipeId, formData);
  }

  return (
    <RecipeEditForm
      initial={initial}
      categories={categories}
      onSave={handleSave}
      heading="Edit Recipe"
      onStartOver={() => router.push(`/recipes/${recipeId}`)}
    />
  );
}
