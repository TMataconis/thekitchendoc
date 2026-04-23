import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FavoriteButton from "../FavoriteButton";
import PrintButton from "./PrintButton";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  if (!recipe) return {};
  return { title: `${recipe.title} — Print — The Kitchen Doc` };
}

export default async function PrintPage({ params }) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/recipes/${id}/print`);
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: Number(id) },
    include: {
      category: true,
      tags: { orderBy: { name: "asc" } },
      ingredientGroups: {
        orderBy: { sortOrder: "asc" },
        include: { ingredients: { orderBy: { sortOrder: "asc" } } },
      },
      instructionGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          instructions: {
            orderBy: { sortOrder: "asc" },
            include: { subSteps: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
      favorites: {
        where: { userId: session.user.id },
        take: 1,
      },
    },
  });

  if (!recipe) notFound();

  const isFavorited = (recipe.favorites?.length ?? 0) > 0;
  const topLevelInstructions = (instructions) =>
    instructions.filter((i) => i.parentInstructionId === null);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="min-h-screen bg-white">
        <main className="max-w-2xl mx-auto px-8 py-10">

          {/* Top bar: branding left, actions right */}
          <div className="flex items-start justify-between mb-8">
            <span className="text-xs font-semibold tracking-widest uppercase text-stone-400">
              The Kitchen Doc
            </span>
            <div className="no-print flex items-center gap-2">
              <FavoriteButton
                recipeId={recipe.id}
                initialFavorited={isFavorited}
              />
              <PrintButton />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-stone-900 leading-tight">
            {recipe.title}
          </h1>

          {/* Servings */}
          {recipe.servings && (
            <p className="mt-2 text-sm text-stone-500">
              <span className="font-medium text-stone-700">Serves:</span>{" "}
              {recipe.servings}
            </p>
          )}

          {/* Ingredients */}
          {recipe.ingredientGroups.length > 0 && (
            <section className="mt-10">
              <h2 className="text-base font-bold uppercase tracking-widest text-stone-800 pb-2 border-b border-stone-200 mb-5">
                Ingredients
              </h2>
              <div className="space-y-6">
                {recipe.ingredientGroups.map((group) => (
                  <div key={group.id}>
                    {group.name && (
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
                        {group.name}
                      </h3>
                    )}
                    <ul className="space-y-1.5">
                      {group.ingredients.map((ing) => (
                        <li key={ing.id} className="flex flex-col">
                          <span className="text-sm text-stone-800">
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
            <section className="mt-10">
              <h2 className="text-base font-bold uppercase tracking-widest text-stone-800 pb-2 border-b border-stone-200 mb-5">
                Instructions
              </h2>
              <div className="space-y-8">
                {recipe.instructionGroups.map((group) => (
                  <div key={group.id}>
                    {group.name && (
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">
                        {group.name}
                      </h3>
                    )}
                    <ol className="space-y-4">
                      {topLevelInstructions(group.instructions).map((step) => (
                        <li key={step.id} className="flex gap-4">
                          <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 text-stone-700 text-xs font-bold flex items-center justify-center">
                            {step.stepNumber}
                          </span>
                          <div className="flex-1 pt-0.5">
                            <p className="text-sm text-stone-800 leading-relaxed">
                              {step.text}
                            </p>
                            {step.subSteps.length > 0 && (
                              <ul className="mt-2 space-y-1.5 pl-1">
                                {step.subSteps.map((sub) => (
                                  <li
                                    key={sub.id}
                                    className="flex gap-3 text-stone-600"
                                  >
                                    <span className="flex-shrink-0 w-4 text-xs font-semibold text-stone-500">
                                      {sub.stepLabel}.
                                    </span>
                                    <p className="text-sm leading-relaxed">
                                      {sub.text}
                                    </p>
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

          {/* Notes */}
          {recipe.notes && (
            <section className="mt-10">
              <h2 className="text-base font-bold uppercase tracking-widest text-stone-800 pb-2 border-b border-stone-200 mb-4">
                Notes
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed">
                {recipe.notes}
              </p>
            </section>
          )}

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-500"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
