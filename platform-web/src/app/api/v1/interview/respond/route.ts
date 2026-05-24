import { NextResponse } from "next/server";

const questions = [
  "How would you design a reliable resume screening pipeline with explainable AI scoring?",
  "Describe how you would handle a production API outage during a recruiter demo.",
  "What metrics would you track to know whether hiring velocity improved?",
  "How do you balance automation with recruiter approval for candidate communication?",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const current = Number(body.question_number ?? 1);
  const next = current + 1;
  if (next > 5) {
    return NextResponse.json({
      completed: true,
      feedback: "Strong structured answer. The demo interview is complete and the report is ready.",
    });
  }
  return NextResponse.json({
    feedback: "Good answer. I am looking for practical ownership, trade-offs, and measurable outcomes.",
    question: {
      question: questions[(next - 2) % questions.length],
      question_number: next,
      total_questions: 5,
      question_type: "scenario",
      topic: "Recruitment systems",
    },
  });
}
