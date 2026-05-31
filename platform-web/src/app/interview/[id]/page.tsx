import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import InterviewRoom from "./InterviewRoom";

type Question = { question: string; competency: string };

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-card border border-border-card p-8 text-center">
        <h1 className="font-serif text-2xl text-ink mb-2">{title}</h1>
        <p className="text-ink-2">{body}</p>
      </div>
    </div>
  );
}

// Public, token-gated candidate interview. The token is the [id] segment.
export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;

  if (!hasServiceRole()) {
    return (
      <Notice
        title="Interviews not enabled yet"
        body="This interview link can't be opened until the workspace finishes setup. Please check back shortly."
      />
    );
  }

  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, status, questions, invited_name, job_id, public_token")
    .eq("public_token", token)
    .maybeSingle();

  if (!session) {
    return <Notice title="Invalid or expired link" body="This interview link is not valid. Please use the most recent link sent to you." />;
  }
  if (session.status === "completed") {
    return <Notice title="Already completed" body="You've already submitted this interview. Thank you — the team will be in touch." />;
  }

  let jobTitle = "the role";
  if (session.job_id) {
    const { data: job } = await supabase.from("jobs").select("title").eq("id", session.job_id).maybeSingle();
    if (job?.title) jobTitle = job.title;
  }

  const questions = (Array.isArray(session.questions) ? session.questions : []) as Question[];
  if (questions.length === 0) {
    return <Notice title="Interview not ready" body="This interview has no questions yet. Please contact the recruiter." />;
  }

  // Mark as started (best effort).
  await supabase.from("interview_sessions").update({ status: "in_progress", started_at: new Date().toISOString() }).eq("id", session.id);

  return (
    <InterviewRoom
      token={token}
      candidateName={session.invited_name ?? ""}
      jobTitle={jobTitle}
      questions={questions}
    />
  );
}
