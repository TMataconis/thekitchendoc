"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm px-8 py-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5 text-2xl">
            🍳
          </div>

          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
            The Kitchen Doc
          </h1>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            Your personal recipe collection. Sign in to access the kitchen.
          </p>

          <button
            onClick={() => signIn("github", { redirectTo: "/" })}
            className="mt-8 w-full flex items-center justify-center gap-3 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700 active:bg-stone-800 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          Access is by invitation only.
        </p>
      </div>
    </div>
  );
}
