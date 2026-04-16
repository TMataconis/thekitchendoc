import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminNav from "./AdminNav";

export const metadata = {
  title: "Admin — The Kitchen Doc",
};

export default async function AdminLayout({ children }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-52 flex-shrink-0 border-r border-stone-200 bg-white">
        <nav className="py-6 px-3 flex flex-col gap-0.5">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
            Admin
          </p>
          <AdminNav />
        </nav>
      </aside>

      <div className="flex-1 min-w-0 bg-stone-50 overflow-auto">
        {children}
      </div>
    </div>
  );
}
