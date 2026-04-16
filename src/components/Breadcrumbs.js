"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const [crumbs, setCrumbs] = useState([]);

  useEffect(() => {
    if (pathname === "/") {
      setCrumbs([]);
      return;
    }
    fetch(`/api/breadcrumb?path=${encodeURIComponent(pathname)}`)
      .then((r) => r.json())
      .then((data) => setCrumbs(data))
      .catch(() => setCrumbs([]));
  }, [pathname]);

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-stone-300 flex-shrink-0">/</span>}
            {isLast ? (
              <span className="text-stone-400 truncate max-w-[160px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-stone-500 hover:text-amber-700 transition-colors flex-shrink-0"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
