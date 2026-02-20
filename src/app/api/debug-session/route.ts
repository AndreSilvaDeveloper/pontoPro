import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

function getSessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

export async function GET() {
  const session = await getServerSession(authOptions);

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  const tokenPayload = sessionToken
    ? await decode({ token: sessionToken, secret: process.env.NEXTAUTH_SECRET! })
    : null;

  return NextResponse.json({ session, tokenPayload });
}