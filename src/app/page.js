import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="min-h-screen bg-amber-50">
      <main className="max-w-5xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-stone-800 tracking-tight">
            Browse by Category
          </h2>
          <p className="mt-2 text-stone-500">
            Pick a section to explore what&apos;s in the doc.
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="text-stone-400 italic">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.id}`}
                className="group block rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200"
              >
                <div className="p-7">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-200 transition-colors duration-200 flex items-center justify-center mb-4">
                    <span className="text-xl">🍳</span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-800 group-hover:text-amber-700 transition-colors duration-200 leading-snug">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-stone-400 group-hover:text-stone-500 transition-colors duration-200">
                    View recipes →
                  </p>
                </div>
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
