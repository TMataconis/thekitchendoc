"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RecipeEditForm from "@/components/RecipeEditForm";
import { updateRecipe } from "@/app/actions/updateRecipe";
import { deleteMyRecipe } from "@/app/actions/deleteMyRecipe";

export default function EditRecipePage({ recipeId, initial, categories, canDelete }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSave(formData) {
    return updateRecipe(recipeId, formData);
  }

  function handleConfirmDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteMyRecipe(recipeId);
      if (result.error) {
        setDeleteError(result.error);
        setConfirming(false);
      } else {
        router.push("/my-recipes/recipes");
      }
    });
  }

  return (
    <div>
      <RecipeEditForm
        initial={initial}
        categories={categories}
        onSave={handleSave}
        heading="Edit Recipe"
        onStartOver={() => router.push(`/recipes/${recipeId}`)}
      />

      {canDelete && (
        <div className="max-w-2xl mx-auto px-8 pb-16">
          <div className="border-t border-stone-200 pt-8">
            {deleteError && (
              <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </p>
            )}

            {confirming ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-sm font-medium text-red-800 mb-3">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={pending}
                    className="inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pending ? "Deleting…" : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => { setConfirming(false); setDeleteError(null); }}
                    disabled={pending}
                    className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                Delete this recipe
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
