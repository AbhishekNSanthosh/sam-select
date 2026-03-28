import { NextRequest } from "next/server";
import { buildSessionCookie } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return err("Username and password are required.", 400);
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    const isMatch =
      (username.toLowerCase().trim() === "admin" && password === "admin123") ||
      (username.toLowerCase().trim() === adminEmail.toLowerCase().trim() &&
        password === adminPassword);

    if (!isMatch) {
      return err("Invalid username or password.", 401);
    }

    const session = {
      eventId: "admin",
      eventName: "Admin",
      clientName: "Admin",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const cookie = buildSessionCookie(session);

    return new Response(
      JSON.stringify({ success: true, data: { role: "admin" } }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (error) {
    console.error("[auth/login]", error);
    return err("Something went wrong. Please try again.", 500);
  }
}
