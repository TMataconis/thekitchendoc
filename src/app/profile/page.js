import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import RoleRequestSection from "./RoleRequestSection";

export const metadata = {
  title: "My Profile — The Kitchen Doc",
};

const ROLE_BADGES = {
  ADMIN: {
    label: "Admin",
    className: "bg-amber-100 border border-amber-300 text-amber-800",
  },
  CONTRIBUTOR: {
    label: "Contributor",
    className: "bg-stone-100 border border-stone-300 text-stone-700",
  },
  VIEWER: {
    label: "Viewer",
    className: "bg-stone-100 border border-stone-200 text-stone-500",
  },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const [user, existingRequest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        _count: {
          select: {
            recipes: { where: { parentRecipeId: null } },
            favorites: true,
          },
        },
      },
    }),
    prisma.roleRequest.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/");

  const badge = ROLE_BADGES[user.role] ?? ROLE_BADGES.VIEWER;
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const canCreate = user.role === "ADMIN" || user.role === "CONTRIBUTOR";

  return (
    <div className="min-h-screen bg-amber-50">
      <main className="max-w-lg mx-auto px-6 py-14">
        {/* Avatar + identity */}
        <div className="flex flex-col items-center text-center mb-10">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? user.email}
              width={96}
              height={96}
              className="rounded-full ring-4 ring-white shadow-md mb-5"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-amber-100 ring-4 ring-white shadow-md flex items-center justify-center mb-5">
              <span className="text-3xl font-bold text-amber-600">
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
            {user.name ?? "—"}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>

          <span
            className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-5 text-center">
            <p className="text-2xl font-bold text-stone-800 tabular-nums">
              {user._count.recipes}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
              Recipes
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-5 text-center">
            <p className="text-2xl font-bold text-stone-800 tabular-nums">
              {user._count.favorites}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
              Favorites
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-5 text-center">
            <p className="text-sm font-bold text-stone-800 leading-tight">
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
              Member since
            </p>
          </div>
        </div>

        {/* Member since detail */}
        <p className="text-center text-xs text-stone-400 -mt-6 mb-10">
          Joined {memberSince}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/my-recipes"
            className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm font-medium text-stone-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition-all duration-150"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
                  <path d="M9 12h6M9 16h4" />
                </svg>
              </span>
              My Recipes
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-stone-300"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>

          {canCreate && (
            <Link
              href="/my-recipes/new"
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-5 py-4 text-sm font-medium text-stone-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition-all duration-150"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                Create New Recipe
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-stone-300"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          )}
        </div>

        <RoleRequestSection currentRole={user.role} existingRequest={existingRequest} />
      </main>

      <footer className="max-w-lg mx-auto px-6 py-8 mt-8 border-t border-amber-100">
        <p className="text-xs text-stone-400">The Kitchen Doc</p>
      </footer>
    </div>
  );
}
