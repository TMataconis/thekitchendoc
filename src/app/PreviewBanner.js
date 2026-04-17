"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRolePreview } from "@/app/actions/setRolePreview";

const ROLE_LABELS = {
  CONTRIBUTOR: "Contributor",
  VIEWER: "Viewer",
};

export default function PreviewBanner({ role }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleExit() {
    startTransition(async () => {
      await setRolePreview(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-amber-400 border-b border-amber-500">
      <div className="max-w-5xl mx-auto px-8 h-9 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Previewing as {ROLE_LABELS[role] ?? role}
        </div>
        <button
          onClick={handleExit}
          disabled={pending}
          className="text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950 transition-colors disabled:opacity-50"
        >
          {pending ? "Exiting…" : "Exit Preview"}
        </button>
      </div>
    </div>
  );
}
