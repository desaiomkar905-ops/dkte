import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSessionToken, sessionCookieName } from "@/lib/auth";
import { handleRouteError, jsonError, rateLimit, clientKey, readJson } from "@/lib/api";

const bodySchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(clientKey(req, "login"), 10, 60_000)) {
      return jsonError(429, "Too many login attempts. Wait a minute and retry.");
    }
    const { email, password } = bodySchema.parse(await readJson(req));
    const user = await authenticate(email, password);
    if (!user) return jsonError(401, "Invalid email or password");

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "CITIZEN" | "WORKER" | "OFFICIAL",
      departmentId: user.departmentId,
    });
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    res.cookies.set(sessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
    return res;
  } catch (err) {
    return handleRouteError(err);
  }
}
