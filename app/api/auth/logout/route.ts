import { clearAuthSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearAuthSessionCookie();
  return Response.json({ ok: true });
}
