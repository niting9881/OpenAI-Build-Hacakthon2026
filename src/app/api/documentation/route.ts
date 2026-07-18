import { NextResponse } from "next/server";
import { DocumentationRequestSchema } from "@/domain/documentation";
import { loadVerifiedRecord, storeDocumentation } from "@/db/client";
import { generateDocumentation } from "@/documentation/generator";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Request must contain valid JSON." }, { status: 400 }); }
  const parsed = DocumentationRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid documentation request." }, { status: 400 });
  try { const bundle = generateDocumentation(loadVerifiedRecord(parsed.data.investigationId)); storeDocumentation(bundle); return NextResponse.json({ bundle }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Documentation failed." }, { status: 409 }); }
}
