"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/my-recipes", label: "Dashboard", shortLabel: "Home", icon: "▦" },
  { href: "/my-recipes/recipes", label: "My Recipes", shortLabel: "Recipes", icon: "📄" },
  { href: "/my-recipes/favorites", label: "Favorites", shortLabel: "Saved", icon: "♥" },
  { href: "/my-recipes/new", label: "Create New Recipe", shortLabel: "New", icon: "✚" },
];

export default function MyRecipesNav({ variant = "sidebar" }) {
  const pathname = usePathname();

  if (variant === "tabs") {
    return (
      <div className="flex w-full">
        {links.map(({ href, shortLabel, icon }) => {
          const active =
            href === "/my-recipes"
              ? pathname === "/my-recipes"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 text-xs font-medium transition-colors ${
                active
                  ? "text-amber-700 border-b-2 border-amber-500"
                  : "text-stone-500 border-b-2 border-transparent hover:text-stone-800"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{shortLabel}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {links.map(({ href, label, icon }) => {
        const active =
          href === "/my-recipes"
            ? pathname === "/my-recipes"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-amber-50 text-amber-700"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        );
      })}
    </>
  );
}
