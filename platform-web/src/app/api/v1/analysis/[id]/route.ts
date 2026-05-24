import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    analysis_id: id,
    overall_score: 88,
    ats_score: 91,
    content_score: 84,
    format_score: 89,
    jd_match_score: 86,
    keywords: { technical_skills: ["Python", "FastAPI", "PostgreSQL", "React"] },
    improvements: ["Add quantified impact", "Clarify cloud deployment experience"],
  });
}
