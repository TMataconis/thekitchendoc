"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/my-recipes", label: "Dashboard", icon: "▦" },
  { href: "/my-recipes/recipes", label: "My Recipes", icon: "📄" },
  { href: "/my-recipes/favorites", label: "Favorites", icon: "♥" },
  { href: "/my-recipes/new", label: "Create New Recipe", icon: "✚" },
];

export default function MyRecipesNav({ variant = "sidebar" }) {
  const pathname = usePathname();

  if (variant === "tabs") {
    return (
      <div className="flex overflow-x-auto scrollbar-none gap-1 px-3 py-2">
        {links.map(({ href, label, icon }) => {
          const active =
            href === "/my-recipes"
              ? pathname === "/my-recipes"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-amber-100 text-amber-700"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
              }`}
            >
              <span className="text-sm leading-none">{icon}</span>
              {label}
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
