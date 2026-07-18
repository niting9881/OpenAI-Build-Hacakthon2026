import { NextResponse } from "next/server";
import { PublicationDecisionSchema } from "@/domain/documentation";
import { decidePublication } from "@/db/client";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Request must contain valid JSON." }, { status: 400 }); }
  const parsed = PublicationDecisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid publication decision." }, { status: 400 });
  try { return NextResponse.json(decidePublication(parsed.data.investigationId, parsed.data.documentType, parsed.data.decision)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Decision failed." }, { status: 409 }); }
}
