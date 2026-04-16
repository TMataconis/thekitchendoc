"use client";

import { useSearchParams, useRouter } from "next/navigation";

const FILTERS = [
  { value: "titles", label: "Recipe titles" },
  { value: "ingredients", label: "Ingredients" },
  { value: "categories", label: "Categories" },
];

export default function SearchForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const hasInParam = searchParams.has("in");
  const activeSet = new Set(
    hasInParam
      ? (searchParams.get("in") ?? "").split(",").filter(Boolean)
      : ["titles", "ingredients", "categories"]
  );

  function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    const query = data.get("q")?.toString().trim();
    const active = data.getAll("in").map(String);
    if (!query || active.length === 0) return;
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("in", active.join(","));
    router.push(`/search?${params.toString()}`);
  }

  return (
    // key forces remount on URL change so defaultValue/defaultChecked reset
    <form key={searchParams.toString()} onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search recipes, ingredients, categories…"
          autoFocus
          className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <button
          type="submit"
          className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 active:bg-amber-700 transition-colors"
        >
          Search
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-5">
        {FILTERS.map(({ value, label }) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 text-sm text-stone-600 select-none"
          >
            <input
              type="checkbox"
              name="in"
              value={value}
              defaultChecked={activeSet.has(value)}
              className="h-4 w-4 rounded border-stone-300 accent-amber-500"
            />
            {label}
          </label>
        ))}
      </div>
    </form>
  );
}
