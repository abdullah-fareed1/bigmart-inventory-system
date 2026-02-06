import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first, then .env as fallback
config({ path: '.env.local' });
// config({ path: '.env' });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});