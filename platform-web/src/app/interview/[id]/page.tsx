import { createClient } from "@/lib/supabase/server";
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

// Public, token-gated candidate interview. Reads via the get_interview RPC with
// the anon key (no service-role key needed).
export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase.rpc("get_interview", { p_token: token });
  if (!session) {
    return <Notice title="Invalid or expired link" body="This interview link is not valid. Please use the most recent link sent to you." />;
  }
  if (session.status === "completed") {
    return <Notice title="Already completed" body="You've already submitted this interview. Thank you — the team will be in touch." />;
  }
  if (session.expired) {
    return <Notice title="Link expired" body="This interview link has expired. Please ask the recruiter to send you a new invitation." />;
  }

  const questions = (Array.isArray(session.questions) ? session.questions : []) as Question[];
  if (questions.length === 0) {
    return <Notice title="Interview not ready" body="This interview has no questions yet. Please contact the recruiter." />;
  }

  await supabase.rpc("start_interview", { p_token: token });

  return (
    <InterviewRoom
      token={token}
      candidateName={session.invited_name ?? ""}
      jobTitle={session.job_title ?? "the role"}
      questions={questions}
    />
  );
}
