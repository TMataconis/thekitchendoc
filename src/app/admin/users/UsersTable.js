"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/app/actions/adminUsers";

const ROLES = ["ADMIN", "CONTRIBUTOR", "VIEWER"];

const ROLE_COLORS = {
  ADMIN: "bg-amber-100 text-amber-800",
  CONTRIBUTOR: "bg-stone-100 text-stone-700",
  VIEWER: "bg-stone-50 text-stone-500",
};

export default function UsersTable({ users: initial, currentUserId }) {
  const [users, setUsers] = useState(initial);
  const [pendingId, setPendingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [, startTransition] = useTransition();

  function handleRoleChange(userId, role) {
    setErrors((e) => ({ ...e, [userId]: null }));
    setPendingId(userId);
    startTransition(async () => {
      const result = await updateUserRole(userId, role);
      setPendingId(null);
      if (result.error) {
        setErrors((e) => ({ ...e, [userId]: result.error }));
      } else {
        setUsers((us) =>
          us.map((u) => (u.id === userId ? { ...u, role } : u))
        );
      }
    });
  }

  return (
    <div>
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400 hidden md:table-cell">
                Joined
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400 w-20">
                Recipes
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-stone-400 w-40">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-stone-400 italic">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUserId;
                const isPending = pendingId === user.id;
                const userError = errors[user.id];

                return (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt=""
                            width={32}
                            height={32}
                            className="rounded-full ring-1 ring-stone-200 flex-shrink-0"
                          />
                        ) : (
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold flex items-center justify-center">
                            {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-stone-800 truncate">
                            {user.name ?? <span className="italic text-stone-400">No name</span>}
                            {isSelf && (
                              <span className="ml-2 text-xs font-normal text-stone-400">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-stone-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3 text-stone-500 tabular-nums">
                      {user.recipeCount}
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        {isSelf ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[user.role]}`}
                          >
                            {user.role}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={isPending}
                            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
                        {userError && (
                          <p className="mt-1 text-xs text-red-500">{userError}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-stone-400">
        {users.length} user{users.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
