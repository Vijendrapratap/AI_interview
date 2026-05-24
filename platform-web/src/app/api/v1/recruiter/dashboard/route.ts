import { NextResponse } from "next/server";
import { getDemoDashboardData } from "@/lib/data/demo";

export async function GET() {
  return NextResponse.json(getDemoDashboardData());
}
