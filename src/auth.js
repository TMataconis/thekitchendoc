import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!["github", "google"].includes(account?.provider)) return false;

      const email = user.email;
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });

      if (!existing) {
        const count = await prisma.user.count();
        await prisma.user.create({
          data: {
            email,
            name: user.name ?? null,
            image: user.image ?? null,
            role: count === 0 ? "ADMIN" : "VIEWER",
          },
        });
      } else {
        // Keep name and image in sync with the GitHub profile on every sign-in
        await prisma.user.update({
          where: { email },
          data: { name: user.name ?? null, image: user.image ?? null },
        });
      }

      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        // account is only present on sign-in; look up the DB user once to
        // embed id and role into the token for all subsequent requests
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.realRole = token.role; // always the real DB role

      // Apply role preview for ADMINs — read cookie at request time
      let previewRole = null;
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const raw = cookieStore.get("role_preview")?.value;
        if (token.role === "ADMIN" && ["CONTRIBUTOR", "VIEWER"].includes(raw)) {
          previewRole = raw;
        }
      } catch {
        // cookies() unavailable in Edge runtime — fall back to real role
      }

      session.user.role = previewRole ?? token.role;
      return session;
    },
  },
});
