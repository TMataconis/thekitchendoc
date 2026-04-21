"use client";

import { useState } from "react";

const ROLE_COLORS = {
  ADMIN: "bg-amber-100 text-amber-800 border-amber-300",
  CONTRIBUTOR: "bg-stone-100 text-stone-700 border-stone-300",
  VIEWER: "bg-stone-100 text-stone-500 border-stone-200",
};

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[role] ?? ROLE_COLORS.VIEWER}`}>
      {role}
    </span>
  );
}

function RequestCard({ req, onDecision }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function decide(status) {
    setLoading(true);
    const res = await fetch(`/api/role-requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminComment: comment }),
    });
    setLoading(false);
    if (res.ok) onDecision(req.id, status, comment);
  }

  const date = new Date(req.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">{req.user.name ?? "—"}</p>
          <p className="text-xs text-stone-500 mt-0.5">{req.user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <RoleBadge role={req.user.role} />
            <span className="text-stone-400 text-xs">→</span>
            <RoleBadge role={req.requestedRole} />
          </div>
        </div>
        <p className="text-xs text-stone-400">{date}</p>
      </div>

      {req.message && (
        <p className="mt-3 text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
          {req.message}
        </p>
      )}

      {req.status === "PENDING" && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          {expanded ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Optional note to the user..."
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => decide("APPROVED")}
                  disabled={loading}
                  className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "…" : "Approve"}
                </button>
                <button
                  onClick={() => decide("DENIED")}
                  disabled={loading}
                  className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {loading ? "…" : "Deny"}
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              Review →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestsManager({ initialRequests }) {
  const [requests, setRequests] = useState(initialRequests);

  function handleDecision(id, status, adminComment) {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, status, adminComment } : r)
    );
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const resolved = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 mb-4">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-400 italic">No pending requests.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((req) => (
              <RequestCard key={req.id} req={req} onDecision={handleDecision} />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 mb-4">
            Resolved ({resolved.length})
          </h2>
          <div className="flex flex-col gap-3">
            {resolved.map((req) => (
              <div key={req.id} className="rounded-xl border border-stone-100 bg-white px-5 py-4 opacity-70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{req.user.name ?? "—"}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{req.user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <RoleBadge role={req.user.role} />
                      <span className="text-stone-400 text-xs">→</span>
                      <RoleBadge role={req.requestedRole} />
                      <span className={`text-xs font-semibold ${req.status === "APPROVED" ? "text-green-600" : "text-red-500"}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-400">
                    {new Date(req.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                {req.adminComment && (
                  <p className="mt-2 text-xs text-stone-500 italic">Note: {req.adminComment}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
