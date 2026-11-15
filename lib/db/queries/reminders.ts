import "server-only";
import { and, eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { runWithDbFallback } from "../client";
import { readLocalStore, writeLocalStore } from "../local-store";
import { type PushSubscriptionRow, pushSubscriptionRecord } from "../schema";

export async function savePushSubscription(input: {
  learnerId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<PushSubscriptionRow> {
  const now = new Date();

  return await runWithDbFallback(
    async (db) => {
      const existing = await db
        .select()
        .from(pushSubscriptionRecord)
        .where(
          and(
            eq(pushSubscriptionRecord.learnerId, input.learnerId),
            eq(pushSubscriptionRecord.endpoint, input.endpoint)
          )
        )
        .limit(1);

      if (existing[0]) {
        const updated = await db
          .update(pushSubscriptionRecord)
          .set({
            p256dh: input.p256dh,
            auth: input.auth,
            userAgent: input.userAgent ?? existing[0].userAgent,
          })
          .where(eq(pushSubscriptionRecord.id, existing[0].id))
          .returning();
        return updated[0];
      }

      const inserted = await db
        .insert(pushSubscriptionRecord)
        .values({
          learnerId: input.learnerId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent ?? null,
          lastNotifiedDate: null,
          createdAt: now,
        })
        .returning();
      return inserted[0];
    },
    () => {
      const store = readLocalStore();
      const existingEntry = Object.values(store.pushSubscriptions).find(
        (sub) =>
          sub.learnerId === input.learnerId && sub.endpoint === input.endpoint
      );

      const id = existingEntry?.id ?? generateUUID();
      const row: PushSubscriptionRow = {
        id,
        learnerId: input.learnerId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastNotifiedDate: existingEntry?.lastNotifiedDate ?? null,
        createdAt: existingEntry ? new Date(existingEntry.createdAt) : now,
      };

      store.pushSubscriptions[id] = {
        ...row,
        createdAt: row.createdAt.toISOString(),
      };
      writeLocalStore(store);
      return row;
    }
  );
}

export async function getLearnerPushSubscriptions(
  learnerId: string
): Promise<PushSubscriptionRow[]> {
  return await runWithDbFallback(
    async (db) =>
      await db
        .select()
        .from(pushSubscriptionRecord)
        .where(eq(pushSubscriptionRecord.learnerId, learnerId)),
    () => {
      const store = readLocalStore();
      return Object.values(store.pushSubscriptions)
        .filter((sub) => sub.learnerId === learnerId)
        .map((sub) => ({
          ...sub,
          createdAt: new Date(sub.createdAt),
        }));
    }
  );
}

export async function removePushSubscriptionByEndpoint(
  learnerId: string,
  endpoint: string
): Promise<void> {
  await runWithDbFallback(
    async (db) => {
      await db
        .delete(pushSubscriptionRecord)
        .where(
          and(
            eq(pushSubscriptionRecord.learnerId, learnerId),
            eq(pushSubscriptionRecord.endpoint, endpoint)
          )
        );
    },
    () => {
      const store = readLocalStore();
      for (const [key, sub] of Object.entries(store.pushSubscriptions)) {
        if (sub.learnerId === learnerId && sub.endpoint === endpoint) {
          delete store.pushSubscriptions[key];
        }
      }
      writeLocalStore(store);
    }
  );
}

export async function markPushSubscriptionNotified(
  id: string,
  dateStr: string
): Promise<void> {
  await runWithDbFallback(
    async (db) => {
      await db
        .update(pushSubscriptionRecord)
        .set({ lastNotifiedDate: dateStr })
        .where(eq(pushSubscriptionRecord.id, id));
    },
    () => {
      const store = readLocalStore();
      if (store.pushSubscriptions[id]) {
        store.pushSubscriptions[id].lastNotifiedDate = dateStr;
        writeLocalStore(store);
      }
    }
  );
}
