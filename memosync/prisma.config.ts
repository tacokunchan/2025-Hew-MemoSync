import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts", // シードデータの作成
  },
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: env("DIRECT_URL"),
  },
});