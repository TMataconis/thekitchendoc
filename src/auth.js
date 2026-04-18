import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "magic-link",
      name: "magic-link",
      credentials: {
        email: { label: "Email", type: "email" },
        oneTimeToken: { label: "Token", type: "text" },
      },
      async authorize({ email, oneTimeToken }) {
        if (!email || !oneTimeToken) return null;

        // Find and validate the token
        const record = await prisma.verificationToken.findUnique({
          where: { identifier_token: { identifier: email, token: oneTimeToken } },
        });
        if (!record || record.expires < new Date()) return null;

        // Consume the token
        await prisma.verificationToken.delete({
          where: { identifier_token: { identifier: email, token: oneTimeToken } },
        });

        // Find or create the user
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const count = await prisma.user.count();
          user = await prisma.user.create({
            data: {
              email,
              role: count === 0 ? "ADMIN" : "VIEWER",
            },
          });
        }

        return { id: String(user.id), email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!["github", "google", "magic-link"].includes(account?.provider)) return false;

      const email = user.email;
      if (!email) return false;

      // OAuth providers: upsert user and keep name/image in sync
      if (account.provider !== "magic-link") {
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
          await prisma.user.update({
            where: { email },
            data: { name: user.name ?? null, image: user.image ?? null },
          });
        }
      }

      return true;
    },

    async jwt({ token, account }) {
      if (account) {
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
      session.user.realRole = token.role;

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
