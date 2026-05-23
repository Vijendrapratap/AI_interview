import "server-only";

/** Fires the FastAPI analysis for an application. Caller schedules this via after(). */
export async function triggerAnalysis(params: {
  resumeId: string;
  applicationId: string;
  jobId: string | null;
  accessToken: string;
}) {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  try {
    await fetch(`${base}/api/v1/analysis/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        resume_id: params.resumeId,
        application_id: params.applicationId,
        job_id: params.jobId,
      }),
    });
  } catch {
    // The application stays analysis_status='pending' and can be re-run from the UI.
  }
}
