import "server-only";
import { cookies } from "next/headers";
import {
  AUTH_SESSION_COOKIE_NAME,
  isProductionEnvironment,
  LEARNER_COOKIE_NAME,
} from "@/lib/constants";
import {
  type SessionPayload,
  signSessionToken,
  verifySessionToken,
} from "./crypto";

export async function getAuthSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(raw);
  } catch {
    return null;
  }
}

export async function setAuthSessionCookie(
  payload: Omit<SessionPayload, "exp">
): Promise<void> {
  const cookieStore = await cookies();
  const token = signSessionToken(payload);
  cookieStore.set(AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (payload.learnerId) {
    cookieStore.set(LEARNER_COOKIE_NAME, payload.learnerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProductionEnvironment,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
}

export async function clearAuthSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE_NAME);
}
