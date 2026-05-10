import { defineConfig } from "prisma/config";

process.loadEnvFile?.(".env");
const databaseUrl = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --env-file=.env --import tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
