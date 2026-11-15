import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

const isSafeBuildMode = process.argv.includes("--safe");

async function runMigrate(): Promise<void> {
  const url = process.env.POSTGRES_URL?.trim();
  if (!url) {
    console.info(
      "[db:migrate] POSTGRES_URL is not set — skipping SQL migrations (app will use local fallback store)."
    );
    return;
  }

  const connection = postgres(url, { max: 1, connect_timeout: 10 });
  const db = drizzle(connection);

  try {
    console.info("[db:migrate] Running Ranedeer schema migrations...");
    await migrate(db, {
      migrationsFolder: "./lib/db/migrations",
      migrationsTable: "__ranedeer_migrations",
    });
    console.info("[db:migrate] Migrations complete.");
  } finally {
    await connection.end({ timeout: 3 }).catch(() => undefined);
  }
}

runMigrate().catch((err) => {
  if (isSafeBuildMode) {
    console.warn(
      "[db:migrate] Warning — could not apply migrations during build (continuing with runtime fallback):",
      err instanceof Error ? err.message : String(err)
    );
    process.exit(0);
  }
  console.error("[db:migrate] Migration failed:", err);
  process.exit(1);
});
