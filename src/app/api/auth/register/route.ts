import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken, sessionCookieName } from "@/lib/auth";
import { handleRouteError, jsonError, rateLimit, clientKey } from "@/lib/api";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/).optional(),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(clientKey(req, "register"), 5, 60 * 60_000)) {
      return jsonError(429, "Too many registration attempts. Try again later.");
    }
    const body = bodySchema.parse(await req.json());

    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) return jsonError(409, "An account with this email already exists");

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(body.password),
        phone: body.phone,
        role: "CITIZEN", // self-registration is citizen-only; workers/officials are provisioned by admins
      },
    });

    const token = await createSessionToken({ id: user.id, email: user.email, name: user.name, role: "CITIZEN" });
    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    res.cookies.set(sessionCookieName(), token, cookieOpts());
    return res;
  } catch (err) {
    return handleRouteError(err);
  }
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  };
}
