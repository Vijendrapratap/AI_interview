import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    analysis_id: `demo-analysis-${Date.now()}`,
    resume_id: body.resume_id ?? "demo-resume",
    overall_score: 88,
    ats_score: 91,
    content_score: 84,
    format_score: 89,
    jd_match_score: body.job_description ? 86 : null,
    keywords: {
      technical_skills: ["Python", "FastAPI", "PostgreSQL", "React", "System Design"],
      missing_keywords: ["Kubernetes"],
      found_keywords: { technical: ["Python", "FastAPI", "PostgreSQL", "React"] },
    },
    sections: {
      experience_summary: "Strong delivery evidence across backend systems and product workflows.",
      education: "Relevant technical education and continuous learning signals.",
    },
    improvements: [
      "Add two metrics showing business impact for recent projects.",
      "Mention one production-scale deployment example.",
      "Clarify ownership of API reliability and monitoring work.",
    ],
  });
}
