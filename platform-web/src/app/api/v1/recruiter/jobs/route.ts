import { NextResponse } from "next/server";
import { demoJobs } from "@/lib/data/demo";

export async function GET() {
  return NextResponse.json(demoJobs);
}
