"use client";

import { useState } from "react";

const STATUS_STYLES = {
  PENDING: "bg-amber-50 border-amber-200 text-amber-800",
  APPROVED: "bg-green-50 border-green-200 text-green-800",
  DENIED: "bg-red-50 border-red-200 text-red-800",
};

export default function RoleRequestSection({ currentRole, existingRequest }) {
  const [requestedRole, setRequestedRole] = useState("CONTRIBUTOR");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (currentRole === "ADMIN") return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/role-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedRole, message }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
    } else {
      setSubmitted(true);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-stone-200 bg-white px-6 py-5">
      <h2 className="text-sm font-semibold text-stone-700 mb-1">Request a role upgrade</h2>

      {existingRequest?.status === "PENDING" ? (
        <div>
          <p className="text-sm text-stone-500 mb-3">
            You have a pending request for <strong>{existingRequest.requestedRole}</strong>.
          </p>
          <div className={`rounded-lg border px-4 py-3 text-sm ${STATUS_STYLES.PENDING}`}>
            <span className="font-semibold">Pending review</span>
            <span className="ml-1">— we'll email you when a decision is made.</span>
          </div>
        </div>
      ) : submitted ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${STATUS_STYLES.PENDING}`}>
          <p className="font-semibold">Request submitted!</p>
          <p className="mt-0.5">We'll email you when a decision is made.</p>
        </div>
      ) : (
        <>
          {existingRequest && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${STATUS_STYLES[existingRequest.status]}`}>
              <p className="font-semibold">
                Previous request {existingRequest.status.toLowerCase()} — {existingRequest.requestedRole}
              </p>
              {existingRequest.adminComment && (
                <p className="mt-1 text-xs opacity-80">Admin note: {existingRequest.adminComment}</p>
              )}
            </div>
          )}

          <p className="text-xs text-stone-400 mb-4">
            Explain why you'd like elevated access and what you plan to contribute.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Requested role</label>
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
              >
                <option value="CONTRIBUTOR">Contributor — can create and edit recipes</option>
                <option value="ADMIN">Admin — full access</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Tell us a bit about yourself and why you'd like access..."
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
