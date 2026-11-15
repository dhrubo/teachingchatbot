import "server-only";
import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { isProductionEnvironment, isTestEnvironment } from "@/lib/constants";

type VapidKeyPair = {
  publicKey: string;
  privateKey: string;
  subject: string;
  source: "env" | "local-auto";
};

let cachedVapid: VapidKeyPair | null = null;
const DEV_VAPID_PATH = path.join(process.cwd(), ".data", "vapid-dev.json");

export function getOrInitVapidKeys(): VapidKeyPair | null {
  if (cachedVapid) {
    return cachedVapid;
  }

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:tutor@example.com";

  if (pub && priv) {
    cachedVapid = {
      publicKey: pub,
      privateKey: priv,
      subject,
      source: "env",
    };
    return cachedVapid;
  }

  // In production on Vercel, explicit VAPID env vars should be set so keys survive cold starts.
  if (isProductionEnvironment && !isTestEnvironment) {
    return null;
  }

  // In local dev or tests, auto-generate and persist a local VAPID pair so Web Push works out of the box!
  try {
    if (!isTestEnvironment && fs.existsSync(DEV_VAPID_PATH)) {
      const saved = JSON.parse(
        fs.readFileSync(DEV_VAPID_PATH, "utf-8")
      ) as Partial<VapidKeyPair>;
      if (saved.publicKey && saved.privateKey) {
        cachedVapid = {
          publicKey: saved.publicKey,
          privateKey: saved.privateKey,
          subject,
          source: "local-auto",
        };
        return cachedVapid;
      }
    }
  } catch {
    // Regenerate below
  }

  const generated = webpush.generateVAPIDKeys();
  cachedVapid = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
    source: "local-auto",
  };

  if (!isTestEnvironment) {
    try {
      const dir = path.dirname(DEV_VAPID_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        DEV_VAPID_PATH,
        JSON.stringify(cachedVapid, null, 2),
        "utf-8"
      );
    } catch {
      // Ignore write error on read-only FS
    }
  }

  return cachedVapid;
}

export type ReminderPushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export async function sendWebPushNotification(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: ReminderPushPayload
): Promise<{ sent: boolean; gone?: boolean; error?: string }> {
  const vapid = getOrInitVapidKeys();
  if (!vapid) {
    return {
      sent: false,
      error:
        "VAPID keys are not configured on this deployment. Run `pnpm vapid:generate` and add them to your environment.",
    };
  }

  if (isTestEnvironment) {
    return { sent: true };
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12 }
    );
    return { sent: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      return { sent: false, gone: true, error: "Subscription expired" };
    }
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Push delivery failed",
    };
  }
}
