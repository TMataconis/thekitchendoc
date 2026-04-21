import Link from "next/link";

export const metadata = {
  title: "Access Restricted — The Kitchen Doc",
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm px-8 py-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-5 text-2xl">
            🔒
          </div>

          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
            Access Restricted
          </h1>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            You don&apos;t have permission to view this page.
          </p>

          <Link
            href="/"
            className="mt-8 w-full flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 active:bg-amber-700 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
