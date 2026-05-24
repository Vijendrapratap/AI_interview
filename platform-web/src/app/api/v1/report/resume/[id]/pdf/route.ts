export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = `ReCruItAI demo resume report\nAnalysis: ${id}\nOverall score: 88/100\nRecommendation: Proceed to recruiter review.\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${id}-demo-report.txt"`,
    },
  });
}
