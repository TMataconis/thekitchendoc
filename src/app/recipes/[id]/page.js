import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  if (!recipe) return {};
  return { title: `${recipe.title} — The Kitchen Doc` };
}

export default async function RecipePage({ params }) {
  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id: Number(id) },
    include: {
      category: true,
      tags: { orderBy: { name: "asc" } },
      ingredientGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
        },
      },
      instructionGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          instructions: {
            orderBy: { sortOrder: "asc" },
            include: {
              subSteps: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      variations: {
        orderBy: { sortOrder: "asc" },
        where: { parentRecipeId: Number(id) },
      },
    },
  });

  if (!recipe) notFound();

  // Top-level instructions only (subSteps are nested under their parent)
  const topLevelInstructions = (instructions) =>
    instructions.filter((i) => i.parentInstructionId === null);

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight text-stone-800 hover:text-amber-700 transition-colors flex-shrink-0"
            >
              The Kitchen Doc
            </Link>
            <span className="text-stone-400 text-sm flex-shrink-0">/</span>
            <Link
              href={`/categories/${recipe.category.id}`}
              className="text-sm text-stone-500 hover:text-amber-700 transition-colors flex-shrink-0"
            >
              {recipe.category.name}
            </Link>
            <span className="text-stone-400 text-sm flex-shrink-0">/</span>
            <span className="text-sm text-stone-400 truncate max-w-[180px]">
              {recipe.title}
            </span>
          </div>
          <Link
            href="/search"
            aria-label="Search"
            className="ml-3 flex-shrink-0 rounded-lg p-2 text-stone-400 hover:bg-amber-100 hover:text-amber-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14 space-y-12">
        {/* Title + meta */}
        <div>
          <h1 className="text-4xl font-bold text-stone-800 tracking-tight leading-tight">
            {recipe.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {recipe.servings && (
              <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-sm font-medium text-amber-800">
                {recipe.servings}
              </span>
            )}
            {recipe.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-white border border-stone-200 px-3 py-1 text-sm text-stone-500"
              >
                {tag.name}
              </span>
            ))}
          </div>

          {recipe.notes && (
            <p className="mt-5 text-stone-500 text-sm leading-relaxed border-l-2 border-amber-300 pl-4">
              {recipe.notes}
            </p>
          )}
        </div>

        {/* Ingredients */}
        {recipe.ingredientGroups.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-5">
              Ingredients
            </h2>
            <div className="space-y-7">
              {recipe.ingredientGroups.map((group) => (
                <div key={group.id}>
                  {group.name && (
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-amber-700 mb-3">
                      {group.name}
                    </h3>
                  )}
                  <ul className="space-y-2">
                    {group.ingredients.map((ing) => (
                      <li key={ing.id} className="flex flex-col">
                        <span className="text-stone-700">
                          {[ing.amount, ing.unit, ing.name]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                        {ing.note && (
                          <span className="text-xs text-stone-400 mt-0.5">
                            {ing.note}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instructions */}
        {recipe.instructionGroups.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-5">
              Instructions
            </h2>
            <div className="space-y-8">
              {recipe.instructionGroups.map((group) => (
                <div key={group.id}>
                  {group.name && (
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-amber-700 mb-4">
                      {group.name}
                    </h3>
                  )}
                  <ol className="space-y-5">
                    {topLevelInstructions(group.instructions).map((step) => (
                      <li key={step.id} className="flex gap-4">
                        <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-sm font-bold flex items-center justify-center">
                          {step.stepNumber}
                        </span>
                        <div className="flex-1 pt-0.5">
                          <p className="text-stone-700 leading-relaxed">
                            {step.text}
                          </p>
                          {step.subSteps.length > 0 && (
                            <ul className="mt-3 space-y-2 pl-1">
                              {step.subSteps.map((sub) => (
                                <li
                                  key={sub.id}
                                  className="flex gap-3 text-stone-600"
                                >
                                  <span className="flex-shrink-0 w-5 text-sm font-semibold text-amber-600">
                                    {sub.stepLabel}.
                                  </span>
                                  <p className="leading-relaxed">{sub.text}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Variations */}
        {recipe.variations.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-5">
              Variations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recipe.variations.map((variation) => (
                <Link
                  key={variation.id}
                  href={`/recipes/${variation.id}`}
                  className="group block rounded-2xl bg-white border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 p-5"
                >
                  <p className="font-semibold text-stone-800 group-hover:text-amber-700 transition-colors duration-200">
                    {variation.title}
                  </p>
                  {variation.servings && (
                    <p className="mt-1 text-xs text-stone-400">
                      {variation.servings}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-stone-400 group-hover:text-stone-500 transition-colors duration-200">
                    View variation →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 mt-8 border-t border-amber-100">
        <p className="text-xs text-stone-400">The Kitchen Doc</p>
      </footer>
    </div>
  );
}
