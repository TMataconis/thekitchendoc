"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadImage } from "@/app/actions/uploadImage";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function emptyIngredient() {
  return { amount: "", unit: "", name: "", note: "" };
}

export function emptyIngredientGroup() {
  return { name: "", ingredients: [emptyIngredient()] };
}

export function emptyInstruction() {
  return { text: "", subSteps: [] };
}

export function emptyInstructionGroup() {
  return { name: "", instructions: [emptyInstruction()] };
}

function emptyRecipe() {
  return {
    title: "",
    servings: "",
    notes: "",
    imageUrl: "",
    categoryId: "",
    tagInput: "",
    tags: [],
    ingredientGroups: [emptyIngredientGroup()],
    instructionGroups: [emptyInstructionGroup()],
  };
}

// ── Image resize helper (Canvas API) ──────────────────────────────────────────

const MAX_WIDTH = 1200;

function resizeToBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

// ── Primitives ────────────────────────────────────────────────────────────────

export function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1.5">
      {children}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, className = "" }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-shadow ${className}`}
    />
  );
}

export function FormTextarea({ value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-shadow resize-y ${className}`}
    />
  );
}

export function RemoveButton({ onClick, label = "Remove" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

export function AddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {children}
    </button>
  );
}

// ── Main form component ───────────────────────────────────────────────────────

/**
 * Shared recipe editor used by both the new-recipe flow and the edit flow.
 *
 * Props:
 *   initial    – pre-populated form data (or null/undefined for a blank form)
 *   categories – array of { id, name } from the DB
 *   onSave     – async fn(formData) → { id } | { error }
 *   heading    – page heading string
 *   onStartOver – optional fn(); if provided, renders a "← back" button
 */
export default function RecipeEditForm({ initial, categories, onSave, heading, onStartOver }) {
  const router = useRouter();

  const [recipe, setRecipe] = useState(() => ({
    ...emptyRecipe(),
    ...(initial ?? {}),
    categoryId: initial?.categoryId != null ? String(initial.categoryId) : "",
    tags: initial?.tags ?? [],
    tagInput: "",
  }));

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── Image state ──
  const [imageFile, setImageFile] = useState(null);      // resized Blob pending upload
  const [imagePreview, setImagePreview] = useState(      // data URL shown in UI
    initial?.imageUrl || null
  );
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);

  // ── Generic field setter ──

  function set(field, value) {
    setRecipe((r) => ({ ...r, [field]: value }));
  }

  // ── Image ──

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setImageError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be under 5 MB.");
      return;
    }
    try {
      const resized = await resizeToBlob(file);
      setImageFile(resized);
      setImagePreview(URL.createObjectURL(resized));
    } catch {
      setImageError("Could not process image. Please try another file.");
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    set("imageUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Tags ──

  function addTag(name) {
    const trimmed = name.trim();
    if (!trimmed || recipe.tags.includes(trimmed)) return;
    setRecipe((r) => ({ ...r, tags: [...r.tags, trimmed], tagInput: "" }));
  }

  function removeTag(name) {
    setRecipe((r) => ({ ...r, tags: r.tags.filter((t) => t !== name) }));
  }

  function handleTagKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(recipe.tagInput);
    } else if (e.key === "Backspace" && !recipe.tagInput && recipe.tags.length) {
      removeTag(recipe.tags[recipe.tags.length - 1]);
    }
  }

  // ── Ingredient groups ──

  function updateIngredient(gi, ii, field, value) {
    setRecipe((r) => ({
      ...r,
      ingredientGroups: r.ingredientGroups.map((g, i) =>
        i !== gi ? g : {
          ...g,
          ingredients: g.ingredients.map((ing, j) =>
            j !== ii ? ing : { ...ing, [field]: value }
          ),
        }
      ),
    }));
  }

  function addIngredient(gi) {
    setRecipe((r) => ({
      ...r,
      ingredientGroups: r.ingredientGroups.map((g, i) =>
        i !== gi ? g : { ...g, ingredients: [...g.ingredients, emptyIngredient()] }
      ),
    }));
  }

  function removeIngredient(gi, ii) {
    setRecipe((r) => ({
      ...r,
      ingredientGroups: r.ingredientGroups.map((g, i) =>
        i !== gi ? g : { ...g, ingredients: g.ingredients.filter((_, j) => j !== ii) }
      ),
    }));
  }

  function updateIngredientGroup(gi, field, value) {
    setRecipe((r) => ({
      ...r,
      ingredientGroups: r.ingredientGroups.map((g, i) =>
        i !== gi ? g : { ...g, [field]: value }
      ),
    }));
  }

  function addIngredientGroup() {
    setRecipe((r) => ({
      ...r,
      ingredientGroups: [...r.ingredientGroups, emptyIngredientGroup()],
    }));
  }

  function removeIngredientGroup(gi) {
    setRecipe((r) => ({
      ...r,
      ingredientGroups: r.ingredientGroups.filter((_, i) => i !== gi),
    }));
  }

  // ── Instruction groups ──

  function updateInstruction(gi, ii, field, value) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.map((g, i) =>
        i !== gi ? g : {
          ...g,
          instructions: g.instructions.map((inst, j) =>
            j !== ii ? inst : { ...inst, [field]: value }
          ),
        }
      ),
    }));
  }

  function addInstruction(gi) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.map((g, i) =>
        i !== gi ? g : { ...g, instructions: [...g.instructions, emptyInstruction()] }
      ),
    }));
  }

  function removeInstruction(gi, ii) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.map((g, i) =>
        i !== gi ? g : { ...g, instructions: g.instructions.filter((_, j) => j !== ii) }
      ),
    }));
  }

  function updateInstructionGroup(gi, field, value) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.map((g, i) =>
        i !== gi ? g : { ...g, [field]: value }
      ),
    }));
  }

  function addInstructionGroup() {
    setRecipe((r) => ({
      ...r,
      instructionGroups: [...r.instructionGroups, emptyInstructionGroup()],
    }));
  }

  function removeInstructionGroup(gi) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.filter((_, i) => i !== gi),
    }));
  }

  // ── Sub-steps ──

  function updateSubStep(gi, ii, si, field, value) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.map((g, i) =>
        i !== gi ? g : {
          ...g,
          instructions: g.instructions.map((inst, j) =>
            j !== ii ? inst : {
              ...inst,
              subSteps: inst.subSteps.map((s, k) =>
                k !== si ? s : { ...s, [field]: value }
              ),
            }
          ),
        }
      ),
    }));
  }

  function addSubStep(gi, ii) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.map((g, i) =>
        i !== gi ? g : {
          ...g,
          instructions: g.instructions.map((inst, j) =>
            j !== ii ? inst : {
              ...inst,
              subSteps: [...inst.subSteps, { label: "", text: "" }],
            }
          ),
        }
      ),
    }));
  }

  function removeSubStep(gi, ii, si) {
    setRecipe((r) => ({
      ...r,
      instructionGroups: r.instructionGroups.map((g, i) =>
        i !== gi ? g : {
          ...g,
          instructions: g.instructions.map((inst, j) =>
            j !== ii ? inst : {
              ...inst,
              subSteps: inst.subSteps.filter((_, k) => k !== si),
            }
          ),
        }
      ),
    }));
  }

  // ── Save ──

  async function handleSave() {
    setSaveError(null);
    setSaving(true);

    let resolvedImageUrl = recipe.imageUrl ?? "";

    if (imageFile) {
      const fd = new FormData();
      fd.append("image", imageFile, "upload.jpg");
      fd.append("recipeSlug", recipe.title || "recipe");
      const uploadResult = await uploadImage(fd);
      if (uploadResult.error) {
        setSaveError(`Image upload failed: ${uploadResult.error}`);
        setSaving(false);
        return;
      }
      resolvedImageUrl = uploadResult.url;
    }

    const result = await onSave({
      title: recipe.title,
      servings: recipe.servings,
      notes: recipe.notes,
      imageUrl: resolvedImageUrl,
      categoryId: recipe.categoryId,
      tags: recipe.tags,
      ingredientGroups: recipe.ingredientGroups,
      instructionGroups: recipe.instructionGroups,
    });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
    } else {
      router.push(`/recipes/${result.id}`);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const sectionClass = "rounded-xl border border-stone-200 bg-white p-6";

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">{heading}</h1>
        <div className="flex items-center gap-3">
          {onStartOver && (
            <button
              type="button"
              onClick={onStartOver}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Recipe"}
          </button>
        </div>
      </div>

      {saveError && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      )}

      {/* ── Image upload ── */}
      <div className={sectionClass}>
        <FieldLabel>Photo</FieldLabel>

        {imagePreview ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Recipe preview"
              className="w-full max-h-64 object-cover rounded-lg border border-stone-200"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Replace image
              </button>
              <span className="text-stone-200">·</span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 px-6 py-10 text-center hover:border-amber-300 hover:bg-amber-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-2 text-stone-300"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-sm text-stone-400">Click to upload a photo</p>
            <p className="mt-1 text-xs text-stone-300">JPEG, PNG, WebP · max 5 MB · resized to 1200px</p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          className="hidden"
        />

        {imageError && (
          <p className="mt-2 text-xs text-red-600">{imageError}</p>
        )}
      </div>

      {/* ── Basic info ── */}
      <div className={sectionClass}>
        <div className="space-y-4">
          <div>
            <FieldLabel>Title *</FieldLabel>
            <TextInput value={recipe.title} onChange={(v) => set("title", v)} placeholder="Recipe title" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Category *</FieldLabel>
              <select
                value={recipe.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-shadow"
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Servings</FieldLabel>
              <TextInput value={recipe.servings} onChange={(v) => set("servings", v)} placeholder="e.g. Serves 4" />
            </div>
          </div>

          <div>
            <FieldLabel>Notes</FieldLabel>
            <FormTextarea value={recipe.notes} onChange={(v) => set("notes", v)} placeholder="General notes, tips, or background…" rows={2} />
          </div>

          <div>
            <FieldLabel>Tags</FieldLabel>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 min-h-[38px] focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-shadow">
              {recipe.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-amber-500 hover:text-amber-700 transition-colors">×</button>
                </span>
              ))}
              <input
                type="text"
                value={recipe.tagInput}
                onChange={(e) => set("tagInput", e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(recipe.tagInput)}
                placeholder={recipe.tags.length ? "" : "Add tags (press Enter)…"}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-stone-800 placeholder-stone-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Ingredients ── */}
      <div className={`${sectionClass} space-y-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Ingredients</h2>
          <AddButton onClick={addIngredientGroup}>Add group</AddButton>
        </div>

        {recipe.ingredientGroups.map((group, gi) => (
          <div key={gi} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={group.name}
                onChange={(e) => updateIngredientGroup(gi, "name", e.target.value)}
                placeholder="Group name (optional)"
                className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 placeholder-stone-300 focus:outline-none focus:border-amber-400 transition-colors"
              />
              {recipe.ingredientGroups.length > 1 && (
                <RemoveButton onClick={() => removeIngredientGroup(gi)} label="Remove group" />
              )}
            </div>

            <div className="grid grid-cols-[5rem_5rem_1fr_9rem_1.5rem] gap-2 px-1">
              {["Amount", "Unit", "Ingredient", "Note", ""].map((h) => (
                <span key={h} className="text-xs text-stone-400">{h}</span>
              ))}
            </div>

            {group.ingredients.map((ing, ii) => (
              <div key={ii} className="grid grid-cols-[5rem_5rem_1fr_9rem_1.5rem] gap-2 items-center">
                <input type="text" value={ing.amount} onChange={(e) => updateIngredient(gi, ii, "amount", e.target.value)} placeholder="1½"
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition-shadow" />
                <input type="text" value={ing.unit} onChange={(e) => updateIngredient(gi, ii, "unit", e.target.value)} placeholder="cup"
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition-shadow" />
                <input type="text" value={ing.name} onChange={(e) => updateIngredient(gi, ii, "name", e.target.value)} placeholder="Ingredient name"
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition-shadow" />
                <input type="text" value={ing.note} onChange={(e) => updateIngredient(gi, ii, "note", e.target.value)} placeholder="finely diced"
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition-shadow" />
                {group.ingredients.length > 1 ? (
                  <RemoveButton onClick={() => removeIngredient(gi, ii)} />
                ) : (
                  <span />
                )}
              </div>
            ))}

            <AddButton onClick={() => addIngredient(gi)}>Add ingredient</AddButton>
          </div>
        ))}
      </div>

      {/* ── Instructions ── */}
      <div className={`${sectionClass} space-y-6`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Instructions</h2>
          <AddButton onClick={addInstructionGroup}>Add group</AddButton>
        </div>

        {recipe.instructionGroups.map((group, gi) => (
          <div key={gi} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={group.name}
                onChange={(e) => updateInstructionGroup(gi, "name", e.target.value)}
                placeholder="Group name (optional)"
                className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 placeholder-stone-300 focus:outline-none focus:border-amber-400 transition-colors"
              />
              {recipe.instructionGroups.length > 1 && (
                <RemoveButton onClick={() => removeInstructionGroup(gi)} label="Remove group" />
              )}
            </div>

            {group.instructions.map((inst, ii) => (
              <div key={ii} className="flex gap-3">
                <span className="mt-2 flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                  {ii + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 items-start">
                    <FormTextarea value={inst.text} onChange={(v) => updateInstruction(gi, ii, "text", v)} placeholder="Describe this step…" rows={2} className="flex-1" />
                    {group.instructions.length > 1 && (
                      <RemoveButton onClick={() => removeInstruction(gi, ii)} />
                    )}
                  </div>

                  {inst.subSteps.map((sub, si) => (
                    <div key={si} className="flex gap-2 items-start pl-4 border-l-2 border-amber-100">
                      <input
                        type="text"
                        value={sub.label}
                        onChange={(e) => updateSubStep(gi, ii, si, "label", e.target.value)}
                        placeholder="a"
                        className="w-10 flex-shrink-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-center text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <FormTextarea value={sub.text} onChange={(v) => updateSubStep(gi, ii, si, "text", v)} placeholder="Sub-step text…" rows={1} className="flex-1" />
                      <RemoveButton onClick={() => removeSubStep(gi, ii, si)} />
                    </div>
                  ))}

                  <AddButton onClick={() => addSubStep(gi, ii)}>Add sub-step</AddButton>
                </div>
              </div>
            ))}

            <AddButton onClick={() => addInstruction(gi)}>Add step</AddButton>
          </div>
        ))}
      </div>

      {/* ── Bottom save bar ── */}
      <div className="flex items-center justify-between pt-2">
        {onStartOver ? (
          <button type="button" onClick={onStartOver} className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save Recipe"}
        </button>
      </div>
    </div>
  );
}
