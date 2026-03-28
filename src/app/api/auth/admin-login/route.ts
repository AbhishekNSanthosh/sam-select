import { NextRequest } from "next/server";
import { buildSessionCookie } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return err("Email and password are required.", 400);
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("[admin-login] ADMIN_EMAIL or ADMIN_PASSWORD env vars not set");
      return err("Server configuration error.", 500);
    }

    if (
      email.toLowerCase().trim() !== adminEmail.toLowerCase().trim() ||
      password !== adminPassword
    ) {
      return err("Invalid email or password.", 401);
    }

    const session = {
      eventId: "admin",
      eventName: "Admin",
      clientName: "Admin",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const cookie = buildSessionCookie(session);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    });
  } catch (error) {
    console.error("[admin-login]", error);
    return err("Something went wrong. Please try again.", 500);
  }
}
