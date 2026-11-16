import "server-only";
import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth/session";
import {
  DEFAULT_LEARNER_ID,
  isProductionEnvironment,
  LEARNER_COOKIE_NAME,
} from "@/lib/constants";
import { generateUUID } from "@/lib/utils";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveLearnerIdFromCookies(): Promise<string> {
  try {
    const session = await getAuthSession();
    if (session?.role === "student" && session.learnerId) {
      return session.learnerId;
    }

    const cookieStore = await cookies();
    const existing = cookieStore.get(LEARNER_COOKIE_NAME)?.value;
    if (existing && UUID_REGEX.test(existing)) {
      return existing;
    }
    return DEFAULT_LEARNER_ID;
  } catch {
    return DEFAULT_LEARNER_ID;
  }
}

export async function ensureLearnerCookie(): Promise<string> {
  const session = await getAuthSession();
  if (session?.role === "student" && session.learnerId) {
    return session.learnerId;
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(LEARNER_COOKIE_NAME)?.value;
  if (existing && UUID_REGEX.test(existing)) {
    return existing;
  }

  const freshId = generateUUID();
  cookieStore.set(LEARNER_COOKIE_NAME, freshId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return freshId;
}

export async function setActiveLearnerCookie(learnerId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LEARNER_COOKIE_NAME, learnerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
