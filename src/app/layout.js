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
      <body className="min-h-full flex flex-col w-full overflow-x-hidden">
        <header className="border-b border-amber-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
            {/* Logo — always visible */}
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-stone-800 hover:text-amber-700 transition-colors flex-shrink-0"
            >
              🍳 The Kitchen Doc
            </Link>

            {/* Breadcrumbs — desktop only */}
            <div className="hidden md:block flex-1 min-w-0">
              <Breadcrumbs />
            </div>

            {/* Spacer on mobile so right-side items stay right */}
            <div className="flex-1 md:hidden" />

            {/* Search input — desktop only */}
            <div className="hidden md:block w-60 flex-shrink-0">
              <HeaderSearch />
            </div>

            {/* Search icon — mobile only, links to /search page */}
            <Link
              href="/search"
              aria-label="Search"
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-stone-500 hover:text-amber-700 hover:bg-amber-100 transition-colors flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </Link>

            {/* User menu / sign-in — always visible */}
            <div className="flex-shrink-0">
              {session?.user ? (
                <UserMenu user={session.user} />
              ) : (
                <>
                  {/* Mobile: icon-only avatar button */}
                  <Link
                    href="/api/auth/signin"
                    aria-label="Sign in"
                    className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  </Link>
                  {/* Desktop: labelled button */}
                  <Link
                    href="/api/auth/signin"
                    className="hidden md:inline-flex rounded-full bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                  >
                    Sign in
                  </Link>
                </>
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
