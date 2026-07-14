// Prisma CLI configuration (Prisma 7). Connection URL lives here for Migrate;
// the runtime client uses a driver adapter (see lib/db.ts).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a DIRECT (non-pooled) connection — PgBouncer/pooled
    // endpoints break Prisma Migrate's advisory locks. Neon exposes the direct
    // URL as DATABASE_URL_UNPOOLED; fall back to DATABASE_URL locally.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
});
