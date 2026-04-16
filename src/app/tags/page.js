import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Browse Tags — The Kitchen Doc",
};

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { recipes: true } } },
  });

  return (
    <div className="min-h-screen bg-amber-50">
      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">
            Browse Tags
          </h1>
          <p className="mt-2 text-stone-500">
            {tags.length === 0
              ? "No tags yet."
              : `${tags.length} tag${tags.length === 1 ? "" : "s"} across the collection.`}
          </p>
        </div>

        {tags.length === 0 ? (
          <p className="text-stone-400 italic">Nothing here yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="group inline-flex items-center gap-2 rounded-full bg-white border border-amber-100 shadow-sm px-4 py-2 text-sm font-medium text-stone-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition-all duration-150"
              >
                {tag.name}
                <span className="inline-flex items-center justify-center rounded-full bg-amber-100 group-hover:bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700 transition-colors duration-150 tabular-nums">
                  {tag._count.recipes}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-8 mt-8 border-t border-amber-100">
        <p className="text-xs text-stone-400">The Kitchen Doc</p>
      </footer>
    </div>
  );
}
