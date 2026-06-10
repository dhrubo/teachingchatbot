import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL environment variable is not set. " +
      "Please set it in your .env.local or Vercel environment variables."
  );
}

const client = postgres(connectionString);
const db = drizzle(client);

export { db };
export default db;
