import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const neonHandler = authConfigured ? auth.handler() : null;

function fallback(): Response {
  return NextResponse.json({ data: null, error: null }, { status: 200 });
}

async function forward(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH", req: Request, ctx: unknown) {
  const route = neonHandler?.[method] as ((request: Request, context: unknown) => Promise<Response>) | undefined;
  if (!route) return fallback();
  return route(req, ctx);
}

export const GET = (req: Request, ctx: unknown) => forward("GET", req, ctx);
export const POST = (req: Request, ctx: unknown) => forward("POST", req, ctx);
export const PUT = (req: Request, ctx: unknown) => forward("PUT", req, ctx);
export const DELETE = (req: Request, ctx: unknown) => forward("DELETE", req, ctx);
export const PATCH = (req: Request, ctx: unknown) => forward("PATCH", req, ctx);
