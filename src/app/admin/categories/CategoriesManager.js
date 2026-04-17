"use client";

import { useState, useEffect, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/app/actions/adminCategories";

// ── Drag handle icon ──────────────────────────────────────────────────────────

function DragHandle({ listeners, attributes }) {
  return (
    <button
      type="button"
      {...listeners}
      {...attributes}
      className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors touch-none"
      tabIndex={-1}
      aria-label="Drag to reorder"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="9" cy="5" r="1.5" />
        <circle cx="15" cy="5" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="19" r="1.5" />
        <circle cx="15" cy="19" r="1.5" />
      </svg>
    </button>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableRow({
  cat,
  editingId,
  editValues,
  setEditValues,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  savePending,
  inputCls,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEditing = editingId === cat.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center border-b border-stone-100 last:border-b-0 transition-colors ${
        isDragging
          ? "opacity-50 shadow-lg bg-amber-50 relative z-10"
          : "hover:bg-stone-50"
      }`}
    >
      {/* Drag handle */}
      <div className="pl-3 pr-1 py-3 w-8 flex-shrink-0">
        {!isEditing && <DragHandle listeners={listeners} attributes={attributes} />}
      </div>

      {isEditing ? (
        /* ── Edit mode ── */
        <div className="flex-1 min-w-0 py-2 pr-3">
          {/* Mobile: stacked */}
          <div className="flex flex-col gap-2 md:hidden">
            <input
              type="text"
              value={editValues.name}
              onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
              className={`${inputCls} w-full`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={onSaveEdit}
                disabled={savePending}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          {/* Desktop: inline columns */}
          <div className="hidden md:flex md:items-center">
            <div className="px-3 py-0 flex-1 min-w-0">
              <input
                type="text"
                value={editValues.name}
                onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                className={`${inputCls} w-full`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
              />
            </div>
            <div className="px-3 py-0 w-28 flex-shrink-0">
              <input
                type="number"
                value={editValues.sortOrder}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, sortOrder: e.target.value }))
                }
                className={`${inputCls} w-20`}
              />
            </div>
            <div className="px-3 py-0 w-24 flex-shrink-0 text-stone-400 tabular-nums text-sm">
              {cat.recipeCount}
            </div>
            <div className="px-3 py-0 w-32 flex-shrink-0 flex justify-end">
              <div className="inline-flex items-center gap-3">
                <button
                  onClick={onSaveEdit}
                  disabled={savePending}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── View mode ── */
        <>
          {/* Mobile: card body — name + recipe count + actions stacked */}
          <div className="flex-1 min-w-0 py-3 pr-3 md:hidden">
            <p className="font-medium text-stone-800 text-sm leading-snug">{cat.name}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {cat.recipeCount} recipe{cat.recipeCount === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => onStartEdit(cat)}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Edit
              </button>
              {cat.recipeCount > 0 ? (
                <span title="Has recipes — cannot delete" className="cursor-not-allowed text-xs text-stone-300">
                  Delete
                </span>
              ) : (
                <button
                  onClick={() => onDelete(cat.id)}
                  disabled={savePending}
                  className="text-xs text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Desktop: inline columns */}
          <div className="hidden md:flex md:flex-1 md:items-center">
            <div className="px-3 py-3 flex-1 min-w-0 font-medium text-stone-800 text-sm truncate">
              {cat.name}
            </div>
            <div className="px-3 py-3 w-28 flex-shrink-0 text-stone-500 tabular-nums text-sm">
              {cat.sortOrder}
            </div>
            <div className="px-3 py-3 w-24 flex-shrink-0 text-stone-500 tabular-nums text-sm">
              {cat.recipeCount}
            </div>
            <div className="px-3 py-3 w-32 flex-shrink-0 flex justify-end">
              <div className="inline-flex items-center gap-3">
                <button
                  onClick={() => onStartEdit(cat)}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Edit
                </button>
                {cat.recipeCount > 0 ? (
                  <span
                    title="Has recipes — cannot delete"
                    className="cursor-not-allowed text-xs text-stone-300"
                  >
                    Delete
                  </span>
                ) : (
                  <button
                    onClick={() => onDelete(cat.id)}
                    disabled={savePending}
                    className="text-xs text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", sortOrder: "0" };

export default function CategoriesManager({ categories: initial }) {
  const [categories, setCategories] = useState(initial);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState(EMPTY_FORM);
  const [addValues, setAddValues] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Drag end ────────────────────────────────────────────────────────────────

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex).map((cat, i) => ({
      ...cat,
      sortOrder: i,
    }));

    setCategories(reordered);

    startTransition(async () => {
      const result = await reorderCategories(
        reordered.map(({ id, sortOrder }) => ({ id, sortOrder }))
      );
      if (result.error) setError(result.error);
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditValues({ name: cat.name, sortOrder: String(cat.sortOrder) });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  function handleUpdate() {
    setError(null);
    startTransition(async () => {
      const result = await updateCategory(editingId, editValues);
      if (result.error) {
        setError(result.error);
      } else {
        setCategories((cs) =>
          cs.map((c) => (c.id === editingId ? { ...c, ...result.category } : c))
        );
        setEditingId(null);
      }
    });
  }

  // ── Add ─────────────────────────────────────────────────────────────────────

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createCategory(addValues);
      if (result.error) {
        setError(result.error);
      } else {
        setCategories((cs) => [...cs, { ...result.category, recipeCount: 0 }]);
        setAddValues(EMPTY_FORM);
        setShowAdd(false);
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  function handleDelete(id) {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) {
        setError(result.error);
      } else {
        setCategories((cs) => cs.filter((c) => c.id !== id));
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const inputCls =
    "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 transition-shadow";

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {/* Header row */}
        <div className="hidden md:flex items-center bg-stone-50 border-b border-stone-200">
          <div className="pl-3 pr-1 py-3 w-8 flex-shrink-0" />
          <div className="px-3 py-3 flex-1 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
            Name
          </div>
          <div className="px-3 py-3 w-28 flex-shrink-0 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
            Sort Order
          </div>
          <div className="px-3 py-3 w-24 flex-shrink-0 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
            Recipes
          </div>
          <div className="px-3 py-3 w-32 flex-shrink-0 text-right text-xs font-semibold uppercase tracking-widest text-stone-400">
            Actions
          </div>
        </div>

        {mounted ? <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements: {}, screenReaderInstructions: { draggable: "" } }}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {categories.length === 0 && !showAdd ? (
                <div className="px-4 py-8 text-center text-sm text-stone-400 italic">
                  No categories yet.
                </div>
              ) : (
                categories.map((cat) => (
                  <SortableRow
                    key={cat.id}
                    cat={cat}
                    editingId={editingId}
                    editValues={editValues}
                    setEditValues={setEditValues}
                    onStartEdit={startEdit}
                    onSaveEdit={handleUpdate}
                    onCancelEdit={cancelEdit}
                    onDelete={handleDelete}
                    savePending={pending}
                    inputCls={inputCls}
                  />
                ))
              )}

              {/* Add row */}
              {showAdd && (
                <div className="flex items-center bg-amber-50 border-t border-stone-100">
                  <div className="pl-3 pr-1 py-2 w-8 flex-shrink-0" />
                  <div className="px-3 py-2 flex-1 min-w-0">
                    <input
                      type="text"
                      value={addValues.name}
                      onChange={(e) =>
                        setAddValues((v) => ({ ...v, name: e.target.value }))
                      }
                      placeholder="Category name"
                      className={`${inputCls} w-full`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") {
                          setShowAdd(false);
                          setAddValues(EMPTY_FORM);
                        }
                      }}
                    />
                  </div>
                  <div className="px-3 py-2 w-28 flex-shrink-0">
                    <input
                      type="number"
                      value={addValues.sortOrder}
                      onChange={(e) =>
                        setAddValues((v) => ({ ...v, sortOrder: e.target.value }))
                      }
                      className={`${inputCls} w-20`}
                    />
                  </div>
                  <div className="px-3 py-2 w-24 flex-shrink-0" />
                  <div className="px-3 py-2 w-32 flex-shrink-0 flex justify-end">
                    <div className="inline-flex items-center gap-3">
                      <button
                        onClick={handleCreate}
                        disabled={pending || !addValues.name.trim()}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAdd(false);
                          setAddValues(EMPTY_FORM);
                          setError(null);
                        }}
                        className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
        : null}

      </div>

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add category
        </button>
      )}
    </div>
  );
}
