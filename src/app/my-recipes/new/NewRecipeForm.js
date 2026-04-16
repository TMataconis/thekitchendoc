"use client";

import { useState, useTransition } from "react";
import { parseRecipe } from "@/app/actions/parseRecipe";
import { saveRecipe } from "@/app/actions/saveRecipe";
import RecipeEditForm, { FieldLabel } from "@/components/RecipeEditForm";

// ── Step 1: Paste ─────────────────────────────────────────────────────────────

function PasteStep({ onParsed }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleParse() {
    setError(null);
    startTransition(async () => {
      const result = await parseRecipe(text);
      if (result.error) {
        setError(result.error);
      } else {
        onParsed(result.recipe);
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-2">
        Create New Recipe
      </h1>
      <p className="text-sm text-stone-500 mb-8">
        Paste your recipe text below and let AI parse it into a structured format, or{" "}
        <button
          type="button"
          onClick={() => onParsed(null)}
          className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
        >
          skip to the blank form
        </button>
        .
      </p>

      <div className="mb-4">
        <FieldLabel>Recipe text</FieldLabel>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a recipe here — ingredients, instructions, everything. The AI will structure it for you."
          rows={16}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-shadow resize-y font-mono"
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleParse}
        disabled={pending || !text.trim()}
        className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Parsing…
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
            Parse Recipe
          </>
        )}
      </button>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function NewRecipeForm({ categories, isAdmin }) {
  const [step, setStep] = useState(isAdmin ? 1 : 2);
  const [parsed, setParsed] = useState(null);

  if (step === 1) {
    return (
      <PasteStep
        onParsed={(recipe) => {
          setParsed(recipe);
          setStep(2);
        }}
      />
    );
  }

  return (
    <RecipeEditForm
      initial={parsed}
      categories={categories}
      onSave={saveRecipe}
      heading={parsed ? "Review & Edit Recipe" : "New Recipe"}
      onStartOver={isAdmin ? () => { setParsed(null); setStep(1); } : null}
    />
  );
}
