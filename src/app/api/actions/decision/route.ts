import { NextResponse } from "next/server";
import { ApprovalRequestSchema } from "@/domain/action";
import { decideAndExecuteAction } from "@/db/client";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 2048) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request must contain valid JSON." }, { status: 400 }); }
  const parsed = ApprovalRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid approval request." }, { status: 400 });
  try {
    const result = decideAndExecuteAction(parsed.data.investigationId, parsed.data.actionHash, parsed.data.decision);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Action failed." }, { status: 409 });
  }
}
