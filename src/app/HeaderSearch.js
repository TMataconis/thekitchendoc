"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(
        `/search?q=${encodeURIComponent(q)}&in=titles,ingredients,categories`
      );
    } else {
      router.push("/search");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-0 rounded-full border border-amber-200 bg-amber-50 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-shadow overflow-hidden">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes…"
          className="flex-1 min-w-0 bg-transparent px-4 py-1.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 mr-1 rounded-full text-stone-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>
    </form>
  );
}
