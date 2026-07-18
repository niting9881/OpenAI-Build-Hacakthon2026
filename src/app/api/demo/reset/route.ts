import { NextResponse } from "next/server";
import { z } from "zod";
import { resetDemoData } from "@/db/client";

const ResetSchema = z.object({ confirmation: z.literal("RESET_SANDBOX_DEMO") }).strict();

export async function POST(request: Request) {
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Request must contain valid JSON." }, { status: 400 }); }
  if (!ResetSchema.safeParse(body).success) return NextResponse.json({ error: "Explicit reset confirmation is required." }, { status: 400 });
  return NextResponse.json(resetDemoData());
}
