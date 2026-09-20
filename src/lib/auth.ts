import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ROLES } from "./constants";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "civicshield-dev-secret-change-me"
);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: (typeof ROLES)[number];
  departmentId?: string | null;
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.id || !payload.role) return null;
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as SessionUser["role"],
      departmentId: (payload.departmentId as string) ?? null,
    };
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-cs_session" : "cs_session";
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  // Authorization: Bearer header first, then cookie.
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const user = await readSessionToken(auth.slice(7));
    if (user) return user;
  }
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`${sessionCookieName()}=([^;]+)`));
  if (!m) return null;
  return readSessionToken(decodeURIComponent(m[1]));
}

/** Throws a typed error usable by route handlers. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) throw new ApiError(401, "Authentication required");
  return user;
}

export async function requireRole(req: Request, ...roles: SessionUser["role"][]) {
  const user = await requireUser(req);
  if (!roles.includes(user.role)) throw new ApiError(403, "Insufficient permissions");
  return user;
}

/** Demo credentials are seeded for the hackathon demo (documented in README). */
export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return user;
}
