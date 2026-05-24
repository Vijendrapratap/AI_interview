import { NextResponse } from "next/server";
import { demoCandidates } from "@/lib/data/demo";

export async function GET() {
  return NextResponse.json(demoCandidates);
}
