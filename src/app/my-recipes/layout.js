import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MyRecipesNav from "./MyRecipesNav";

export const metadata = {
  title: "My Recipes — The Kitchen Doc",
};

export default async function MyRecipesLayout({ children }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // VIEWERs go straight to favorites — no sidebar
  if (session.user.role === "VIEWER") {
    return (
      <div className="flex-1 min-w-0 bg-stone-50 overflow-auto">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-52 flex-shrink-0 border-r border-stone-200 bg-white">
        <nav className="py-6 px-3 flex flex-col gap-0.5">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
            My Recipes
          </p>
          <MyRecipesNav />
        </nav>
      </aside>

      <div className="flex-1 min-w-0 bg-stone-50 overflow-auto">
        {children}
      </div>
    </div>
  );
}
