import Link from "next/link";
import { prisma } from "@/lib/prisma";

function TagPills({ tags }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={`/tags/${tag.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-amber-100 shadow-sm px-3 py-1.5 text-sm text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition-all duration-150"
        >
          {tag.name}
          <span className="text-xs font-semibold text-amber-600 tabular-nums">
            {tag._count.recipes}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function Home() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { recipes: true } },
        recipes: {
          where: { imageUrl: { not: "" } },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { imageUrl: true },
        },
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { recipes: true } } },
      where: { recipes: { some: {} } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-amber-50">
      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-stone-800 tracking-tight">
            The Kitchen Doc
          </h1>
          <p className="mt-3 text-stone-500">Every recipe, all in one place.</p>
        </div>

        {categories.length === 0 ? (
          <p className="text-stone-400 italic">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {categories.map((category) => {
              const imageUrl = category.recipes[0]?.imageUrl;
              const count = category._count.recipes;
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.id}`}
                  className="group relative block h-48 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <span className="text-6xl opacity-30">🍽️</span>
                  </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
                    <p className="text-base font-semibold text-white leading-snug">
                      {category.name}
                    </p>
                    <p className="text-xs text-white/70 mt-0.5">
                      {count} recipe{count === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <div className="max-w-5xl mx-auto px-6 mt-12 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-700 tracking-tight">
            Browse by Tag
          </h2>
          <Link
            href="/tags"
            className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            All tags →
          </Link>
        </div>
        <TagPills tags={tags} />
      </div>

      <footer className="max-w-5xl mx-auto px-6 py-8 mt-8 border-t border-amber-100">
        <p className="text-xs text-stone-400">The Kitchen Doc</p>
      </footer>
    </div>
  );
}
