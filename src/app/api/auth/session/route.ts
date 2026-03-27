import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export async function GET() {
  const session = await getSession();
  if (!session) return err("No active session", 401);
  return ok(session);
}
