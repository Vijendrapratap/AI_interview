import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    analysis_id: id,
    resume_id: "demo-resume",
    overall_score: 88,
    score_breakdown: { ats_score: 91, content_score: 84, format_score: 89, jd_match_score: 86 },
    section_analysis: [
      { section_name: "Experience", current_score: 90, issues: [], recommendations: ["Add quantified impact"], before_after_examples: [] },
      { section_name: "Skills", current_score: 86, issues: ["Kubernetes not explicit"], recommendations: ["Add deployment tooling where relevant"], before_after_examples: [] },
    ],
    keyword_analysis: { found_keywords: { technical: ["Python", "FastAPI", "PostgreSQL", "React"] }, missing_keywords: ["Kubernetes"], keyword_density: 0.73 },
    ats_optimization: { score: 91, passed_checks: ["Readable headings", "Clear dates"], failed_checks: [], recommendations: ["Keep formatting simple"] },
    priority_actions: [
      { action: "Add impact metrics", impact: "high", urgency: "high" },
      { action: "Clarify system design examples", impact: "medium", urgency: "medium" },
    ],
    rewrite_examples: [],
  });
}
