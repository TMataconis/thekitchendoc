import { prisma } from "@/lib/prisma";

export function createMinimalAdapter() {
  return {
    async createVerificationToken(token) {
      return prisma.verificationToken.create({ data: token });
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const vt = await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
        return vt.expires < new Date() ? null : vt;
      } catch {
        return null;
      }
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return { ...user, id: String(user.id), emailVerified: null };
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
      return { ...created, id: String(created.id), emailVerified: null };
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!user) return null;
      return { ...user, id: String(user.id), emailVerified: null };
    },
  };
}
