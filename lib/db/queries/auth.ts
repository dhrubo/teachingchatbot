import "server-only";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatbotError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";
import { type User, user } from "../schema";
import { generateHashedPassword } from "../utils";
import { deleteExpiredGuestChats } from "./chat";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    const created = await db
      .insert(user)
      .values({ email, password })
      .returning({
        id: user.id,
        email: user.email,
      });

    // Opportunistic cleanup: every new guest is a chance to purge stale guest
    // history. Fire-and-forget so it never blocks or fails guest creation.
    deleteExpiredGuestChats().catch(() => {
      /* best-effort; the cron job is the backstop */
    });

    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}
