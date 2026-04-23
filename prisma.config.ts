import { config } from "dotenv";
import { existsSync } from "fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
} else {
  config();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
    directUrl: process.env["DIRECT_URL"],
  },
});