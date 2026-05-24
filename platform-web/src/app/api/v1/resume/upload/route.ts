import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const name = file instanceof File ? file.name : "uploaded-resume.pdf";
  return NextResponse.json({
    id: `demo-resume-${Date.now()}`,
    filename: name,
    status: "uploaded",
  });
}
