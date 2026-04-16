"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteMyRecipe } from "@/app/actions/deleteMyRecipe";

export default function RecipeCard({ recipe, onDeleted }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMyRecipe(recipe.id);
      if (result.error) {
        setError(result.error);
        setConfirmDelete(false);
      } else {
        onDeleted(recipe.id);
      }
    });
  }

  return (
    <div className="group relative rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 flex flex-col">
      <div className="p-6 flex-1">
        <p className="text-xs text-stone-400 mb-1">{recipe.category.name}</p>
        <h2 className="text-base font-semibold text-stone-800 leading-snug">
          {recipe.title}
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {recipe.servings && (
            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
              {recipe.servings}
            </span>
          )}
          {recipe.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs text-stone-500"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <p className="mx-6 mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-stone-100">
        <div className="flex items-center gap-3">
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-xs text-stone-400 hover:text-amber-700 transition-colors"
          >
            View
          </Link>
          <span className="text-stone-200">·</span>
          <Link
            href={`/my-recipes/${recipe.id}/edit`}
            className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            Edit
          </Link>
        </div>

        {confirmDelete ? (
          <span className="inline-flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={pending}
              className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
