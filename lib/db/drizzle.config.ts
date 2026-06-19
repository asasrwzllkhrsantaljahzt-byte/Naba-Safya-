import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./dist/schema",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
