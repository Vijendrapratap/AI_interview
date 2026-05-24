import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    overall_score: 84,
    strengths: ["Clear structured answers", "Good product thinking", "Practical trade-off awareness"],
    weaknesses: ["Could add more quantified metrics"],
    recommendation: "Proceed to recruiter review",
  });
}
