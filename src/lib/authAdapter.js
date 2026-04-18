import { prisma } from "@/lib/prisma";

function toUser(user) {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    emailVerified: null,
  };
}

function toToken(vt) {
  return {
    identifier: vt.identifier,
    token: vt.token,
    expires: vt.expires,
  };
}

export function createMinimalAdapter() {
  return {
    async createVerificationToken(token) {
      const vt = await prisma.verificationToken.create({
        data: {
          identifier: token.identifier,
          token: token.token,
          expires: token.expires,
        },
      });
      return toToken(vt);
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const vt = await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
        if (vt.expires < new Date()) return null;
        return toToken(vt);
      } catch {
        return null;
      }
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return toUser(user);
    },

    async createUser(user) {
      // NextAuth calls this only after getUserByEmail returns null, but guard
      // against races with upsert so we never create a duplicate.
      const count = await prisma.user.count();
      const created = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          role: count === 0 ? "ADMIN" : "VIEWER",
        },
      });
      return toUser(created);
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!user) return null;
      return toUser(user);
    },

    async updateUser(user) {
      const updated = await prisma.user.update({
        where: { id: Number(user.id) },
        data: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
      });
      return toUser(updated);
    },

    async linkAccount(account) {
      return account;
    },

    async getAccount({ providerAccountId, provider }) {
      // OAuth accounts are not stored in the DB — return null so NextAuth
      // falls through to the signIn callback for user lookup
      return null;
    },
  };
}
