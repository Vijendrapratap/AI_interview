import { NextResponse } from "next/server";
import { demoCandidates } from "@/lib/data/demo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const candidate = demoCandidates.find((item) => item.id === id);
  if (!candidate) return NextResponse.json({ detail: "Candidate not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    message: `Demo invite queued for ${candidate.full_name}. Template: ${body.template_id ?? "technical-screen"}.`,
  });
}
