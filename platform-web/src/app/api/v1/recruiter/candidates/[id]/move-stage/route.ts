import { NextResponse } from "next/server";
import { demoCandidates } from "@/lib/data/demo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const candidate = demoCandidates.find((item) => item.id === id);
  if (!candidate) return NextResponse.json({ detail: "Candidate not found" }, { status: 404 });
  return NextResponse.json({
    ...candidate,
    applications: candidate.applications.map((app, index) =>
      index === 0 ? { ...app, stage: body.stage ?? app.stage, updated_at: new Date().toISOString() } : app,
    ),
  });
}
