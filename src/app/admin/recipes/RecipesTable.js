"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteRecipe } from "@/app/actions/adminRecipes";

export default function RecipesTable({ recipes: initial }) {
  const [recipes, setRecipes] = useState(initial);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const filtered = search.trim()
    ? recipes.filter((r) =>
        r.title.toLowerCase().includes(search.trim().toLowerCase())
      )
    : recipes;

  function handleDelete(id) {
    setError(null);
    startTransition(async () => {
      const result = await deleteRecipe(id);
      if (result.error) {
        setError(result.error);
      } else {
        setRecipes((rs) => rs.filter((r) => r.id !== id));
      }
      setConfirmId(null);
    });
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title…"
            className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-4 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-shadow"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400 hidden md:table-cell">
                Created By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400 hidden lg:table-cell">
                Servings
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-stone-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-400 italic">
                  {search ? "No recipes match that search." : "No recipes yet."}
                </td>
              </tr>
            ) : (
              filtered.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-800">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="hover:text-amber-700 transition-colors"
                    >
                      {recipe.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{recipe.category.name}</td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                    {recipe.createdBy?.name ?? recipe.createdBy?.email ?? (
                      <span className="italic text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">
                    {recipe.servings || <span className="italic text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/my-recipes/${recipe.id}/edit`}
                        className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                      >
                        Edit
                      </Link>
                      {confirmId === recipe.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(recipe.id)}
                            disabled={pending}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(recipe.id)}
                          className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-stone-400">
        {filtered.length} of {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
