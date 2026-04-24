"use client";

import { useEffect, useRef, useState } from "react";

function formatTimestamp(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(",", " at");
}

function NoteCard({ note, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === note.content) {
      setEditing(false);
      setDraft(note.content);
      return;
    }
    onSave(note.id, trimmed);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(note.content);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSave}
              className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {note.content}
          </p>
          <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit note"
              className="flex items-center justify-center w-6 h-6 rounded-full text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={() => onDelete(note.id)}
              aria-label="Delete note"
              className="flex items-center justify-center w-6 h-6 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
      {!editing && (
        <p className="mt-1.5 text-xs text-stone-400">
          {note.updatedAt && note.updatedAt !== note.createdAt
            ? `Edited ${formatTimestamp(note.updatedAt)}`
            : formatTimestamp(note.createdAt)}
        </p>
      )}
    </div>
  );
}

export default function PersonalNotes({ recipeId }) {
  const [notes, setNotes] = useState(null); // null = loading
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const base = `/api/recipes/${recipeId}/notes`;

  useEffect(() => {
    fetch(base)
      .then((r) => r.json())
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .catch(() => setNotes([]));
  }, [base]);

  async function handleAdd(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    // Optimistic: add a temporary note
    const tempId = `temp-${Date.now()}`;
    const tempNote = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [tempNote, ...(prev ?? [])]);
    setDraft("");
    setSubmitting(true);

    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const saved = await res.json();
      setNotes((prev) =>
        prev.map((n) => (n.id === tempId ? saved : n))
      );
    } catch {
      // Revert on error
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setDraft(content);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId) {
    const prev = notes;
    setNotes((n) => n.filter((note) => note.id !== noteId));

    try {
      await fetch(`${base}/${noteId}`, { method: "DELETE" });
    } catch {
      setNotes(prev);
    }
  }

  async function handleSave(noteId, content) {
    const prev = notes;
    const updatedAt = new Date().toISOString();
    setNotes((n) =>
      n.map((note) => (note.id === noteId ? { ...note, content, updatedAt } : note))
    );

    try {
      const res = await fetch(`${base}/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const saved = await res.json();
      setNotes((n) =>
        n.map((note) => (note.id === noteId ? saved : note))
      );
    } catch {
      setNotes(prev);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-stone-700">My Notes</h2>
        <span className="text-xs font-medium text-stone-400 border border-stone-200 rounded-full px-2 py-0.5">
          private
        </span>
      </div>

      <div className="space-y-3">
        {notes === null && (
          <p className="text-sm text-stone-400">Loading…</p>
        )}
        {notes !== null && notes.length === 0 && (
          <p className="text-sm text-stone-400 italic">No notes yet.</p>
        )}
        {notes !== null && notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onDelete={handleDelete}
            onSave={handleSave}
          />
        ))}
      </div>

      {/* Add note form */}
      <form onSubmit={handleAdd} className="mt-4">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 transition-shadow"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!draft.trim() || submitting}
            className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Note
          </button>
        </div>
      </form>
    </section>
  );
}
