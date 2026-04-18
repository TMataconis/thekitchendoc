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
      console.log("[adapter] createVerificationToken", token.identifier);
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
      console.log("[adapter] useVerificationToken", identifier);
      try {
        const vt = await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
        if (vt.expires < new Date()) {
          console.log("[adapter] useVerificationToken: token expired");
          return null;
        }
        return toToken(vt);
      } catch (err) {
        console.log("[adapter] useVerificationToken: not found or error", err?.message);
        return null;
      }
    },

    async getUserByEmail(email) {
      console.log("[adapter] getUserByEmail", email);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log("[adapter] getUserByEmail: not found");
        return null;
      }
      return toUser(user);
    },

    async createUser(user) {
      console.log("[adapter] createUser", user.email);
      const count = await prisma.user.count();
      const created = await prisma.user.create({
        data: {
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          role: count === 0 ? "ADMIN" : "VIEWER",
        },
      });
      return toUser(created);
    },

    async getUser(id) {
      console.log("[adapter] getUser", id);
      const user = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!user) return null;
      return toUser(user);
    },

    async updateUser(user) {
      console.log("[adapter] updateUser", user.id);
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
      console.log("[adapter] linkAccount", account.provider, account.providerAccountId);
      // Email provider does not use linked accounts — no-op
      return account;
    },
  };
}
