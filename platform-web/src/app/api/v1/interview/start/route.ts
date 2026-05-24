import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    session_id: `demo-session-${Date.now()}`,
    intro_message: "Welcome. I will ask a few practical questions about your experience and problem-solving approach.",
    question: {
      question: "Tell me about a project where you improved a backend workflow or hiring process. What changed because of your work?",
      question_number: 1,
      total_questions: 7,
      question_type: "experience",
      topic: "Project impact",
    },
  });
}
