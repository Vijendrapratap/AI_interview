import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    transcript: "Demo audio answer received.",
    feedback: "Good answer. Continue with a concrete example and measured outcome.",
    question: {
      question: "What would you improve first in this recruitment workflow?",
      question_number: 2,
      total_questions: 5,
      question_type: "scenario",
      topic: "Workflow improvement",
    },
  });
}
