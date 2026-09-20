import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return NextResponse.json({ user });
  } catch (err) {
    return handleRouteError(err);
  }
}
