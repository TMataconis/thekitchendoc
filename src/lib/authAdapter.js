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
      const user = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!user) return null;
      return toUser(user);
    },
  };
}
