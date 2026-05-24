import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ audio_url: null, text: "Demo text-to-speech is disabled in this test environment." });
}
