import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import UserMenu from "./UserMenu";
import HeaderSearch from "./HeaderSearch";
import Breadcrumbs from "@/components/Breadcrumbs";
import PreviewBanner from "./PreviewBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "The Kitchen Doc",
  description: "A personal recipe collection",
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-amber-200 bg-white">
          <div className="max-w-5xl mx-auto px-8 h-14 flex items-center gap-4">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-stone-800 hover:text-amber-700 transition-colors flex-shrink-0"
            >
              🍳 The Kitchen Doc
            </Link>

            <div className="flex-1 min-w-0">
              <Breadcrumbs />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-60">
                <HeaderSearch />
              </div>
              {session?.user ? (
                <UserMenu user={session.user} />
              ) : (
                <Link
                  href="/api/auth/signin"
                  className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>

        {session?.user?.realRole === "ADMIN" && session.user.role !== session.user.realRole && (
          <PreviewBanner role={session.user.role} />
        )}
        {children}
      </body>
    </html>
  );
}
