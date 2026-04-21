"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", shortLabel: "Home", icon: "▦" },
  { href: "/admin/recipes", label: "All Recipes", shortLabel: "Recipes", icon: "📄" },
  { href: "/admin/categories", label: "Categories", shortLabel: "Categories", icon: "🗂" },
  { href: "/admin/users", label: "Users", shortLabel: "Users", icon: "👥" },
  { href: "/admin/requests", label: "Requests", shortLabel: "Requests", icon: "📋" },
];

export default function AdminNav({ variant = "sidebar" }) {
  const pathname = usePathname();

  if (variant === "tabs") {
    return (
      <div className="flex w-full">
        {links.map(({ href, shortLabel, icon }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
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
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
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
