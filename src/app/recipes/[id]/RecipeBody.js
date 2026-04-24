"use client";

import { useState } from "react";
import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import PersonalNotes from "./PersonalNotes";

// ── Fraction helpers ──────────────────────────────────────────────────────────

const UNICODE_FRACTIONS = {
  "½": 1 / 2, "¼": 1 / 4, "¾": 3 / 4,
  "⅓": 1 / 3, "⅔": 2 / 3,
  "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8,
};

const SNAP_FRACTIONS = [
  { v: 1 / 8, s: "⅛" }, { v: 1 / 4, s: "¼" }, { v: 1 / 3, s: "⅓" },
  { v: 3 / 8, s: "⅜" }, { v: 1 / 2, s: "½" }, { v: 5 / 8, s: "⅝" },
  { v: 2 / 3, s: "⅔" }, { v: 3 / 4, s: "¾" }, { v: 7 / 8, s: "⅞" },
];

function parseAmount(str) {
  if (!str?.trim()) return null;
  let s = str.trim();

  // Range like "1-2" or "1–2" → lower bound
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*\d/);
  if (rangeMatch) return parseFloat(rangeMatch[1]);

  // Extract a unicode fraction if present
  let fracVal = 0;
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(char)) {
      fracVal = val;
      s = s.replace(char, "").trim();
      break;
    }
  }

  if (!s) return fracVal || null;

  // Slash fraction e.g. "1/3"
  const slashMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) return parseInt(slashMatch[1]) / parseInt(slashMatch[2]) + fracVal;

  // Plain number
  const numMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return parseFloat(numMatch[1]) + fracVal;

  return null;
}

function formatAmount(val) {
  if (val <= 0) return "0";

  const whole = Math.floor(val);
  const frac = val - whole;

  if (frac < 0.04) return whole === 0 ? "0" : String(whole);
  if (frac > 0.96) return String(whole + 1);

  // Snap to nearest nice fraction
  let best = SNAP_FRACTIONS[0];
  for (const f of SNAP_FRACTIONS) {
    if (Math.abs(f.v - frac) < Math.abs(best.v - frac)) best = f;
  }

  return whole === 0 ? best.s : `${whole} ${best.s}`;
}

function scaleAmount(amountStr, scale) {
  if (!amountStr?.trim()) return amountStr;
  const val = parseAmount(amountStr);
  if (val === null) return amountStr;
  return formatAmount(val * scale);
}

// Extract the first integer (lower bound of range) from a servings string.
function parseBaseServings(str) {
  if (!str) return null;
  const m = str.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Return the non-numeric label part of a servings string.
// "8 Servings" → "Servings", "10-12 Crepes" → "Crepes"
function getServingsLabel(str) {
  if (!str) return "Servings";
  const label = str.replace(/\d+(?:\s*[-–]\s*\d+)?/, "").replace(/\s+/g, " ").trim();
  return label || "Servings";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecipeBody({ recipe, isFavorited, user, recipeId }) {
  const baseServings = parseBaseServings(recipe.servings);
  const canScale = baseServings !== null;
  const [servings, setServings] = useState(baseServings ?? 1);
  const scale = canScale ? servings / baseServings : 1;

  const topLevelInstructions = (instructions) =>
    instructions.filter((i) => i.parentInstructionId === null);

  return (
    <div className="after:content-[''] after:block after:clear-both">
      {/* Float image — right on md+, stacked on mobile */}
      {recipe.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="w-full rounded-2xl shadow-sm mb-6 md:float-right md:w-[45%] md:ml-6 md:mb-4"
        />
      )}

      {/* Title */}
      <h1 className="text-4xl font-bold text-stone-800 tracking-tight leading-tight">
        {recipe.title}
      </h1>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Servings: scaling control or static pill */}
        {recipe.servings && (
          canScale ? (
            <div className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 text-amber-800">
              <button
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
                aria-label="Decrease servings"
                className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold hover:bg-amber-200 transition-colors disabled:opacity-30 ml-0.5"
              >
                −
              </button>
              <span className="px-1 text-sm font-medium tabular-nums whitespace-nowrap">
                {servings} {getServingsLabel(recipe.servings)}
              </span>
              <button
                onClick={() => setServings((s) => s + 1)}
                aria-label="Increase servings"
                className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold hover:bg-amber-200 transition-colors mr-0.5"
              >
                +
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-sm font-medium text-amber-800">
              {recipe.servings}
            </span>
          )
        )}

        {recipe.tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center rounded-full bg-white border border-stone-200 px-3 py-1 text-sm text-stone-500"
          >
            {tag.name}
          </span>
        ))}

        <FavoriteButton recipeId={recipe.id} initialFavorited={isFavorited} />

        <Link
          href={`/recipes/${recipe.id}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-500 hover:border-stone-300 hover:text-stone-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </Link>

        {(user.role === "ADMIN" ||
          (user.role === "CONTRIBUTOR" && recipe.createdById === user.id)) && (
          <Link
            href={`/my-recipes/${recipe.id}/edit`}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Link>
        )}
      </div>

      {recipe.notes && (
        <p className="mt-5 text-stone-500 text-sm leading-relaxed border-l-2 border-amber-300 pl-4">
          {recipe.notes}
        </p>
      )}

      <PersonalNotes recipeId={recipe.id} />

      {/* Ingredients */}
      {recipe.ingredientGroups.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-stone-800 mb-5">Ingredients</h2>
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
                        {[scaleAmount(ing.amount, scale), ing.unit, ing.name]
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
        <section className="mt-12">
          <h2 className="text-xl font-bold text-stone-800 mb-5">Instructions</h2>
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
                        <p className="text-stone-700 leading-relaxed">{step.text}</p>
                        {step.subSteps.length > 0 && (
                          <ul className="mt-3 space-y-2 pl-1">
                            {step.subSteps.map((sub) => (
                              <li key={sub.id} className="flex gap-3 text-stone-600">
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
        <section className="mt-12">
          <h2 className="text-xl font-bold text-stone-800 mb-5">Variations</h2>
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
                  <p className="mt-1 text-xs text-stone-400">{variation.servings}</p>
                )}
                <p className="mt-3 text-sm text-stone-400 group-hover:text-stone-500 transition-colors duration-200">
                  View variation →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
