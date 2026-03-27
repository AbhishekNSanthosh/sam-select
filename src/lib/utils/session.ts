import { cookies } from "next/headers";
import type { ISession } from "@/types";

const SESSION_COOKIE = "ss_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getSession(): Promise<ISession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const session: ISession = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function buildSessionCookie(session: ISession): string {
  const payload = Buffer.from(JSON.stringify({ ...session, expiresAt: Date.now() + SESSION_TTL_MS })).toString("base64");
  return `${SESSION_COOKIE}=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
