import "server-only";

import { chatJSON } from "@/lib/llm/openrouter";

/** A single interview question with the competency it probes. */
export type InterviewQuestion = { question: string; competency: string };

/** One turn of the interview transcript. */
export type TranscriptTurn = { role: "ai" | "candidate"; text: string; questionIndex?: number };

export type InterviewScore = {
  overall_score: number;
  recommendation: "advance" | "hold" | "reject";
  summary: string;
  strengths: string[];
  concerns: string[];
  per_question: { question: string; score: number; feedback: string }[];
};

function clamp(n: unknown, def = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Generates interview questions from the job + the candidate's resume signals.
 * Reuses the screening-stage gap questions when available so the interview probes
 * exactly what the resume left unverified (one shared competency taxonomy).
 */
export async function generateInterviewQuestions(input: {
  jobTitle: string;
  jobDescription?: string;
  requirements?: string[];
  skillsFound?: string[];
  skillsMissing?: string[];
  screeningQuestions?: { question: string; target_competency?: string }[];
  count?: number;
}): Promise<InterviewQuestion[]> {
  const count = input.count ?? 6;
  const seed = (input.screeningQuestions ?? [])
    .map((q) => `- ${q.question} (probes: ${q.target_competency ?? "fit"})`)
    .join("\n");

  try {
    const res = await chatJSON<{ questions: InterviewQuestion[] }>(
      [
        {
          role: "system",
          content:
            "You are an expert interviewer. Produce concise, open-ended spoken interview questions (each under 30 words). " +
            "Probe real depth and the candidate's actual experience; never ask yes/no questions; do not reveal answers. Return ONLY JSON.",
        },
        {
          role: "user",
          content:
            `ROLE: ${input.jobTitle}\n` +
            `REQUIREMENTS: ${(input.requirements ?? []).join(", ")}\n` +
            `DESCRIPTION: ${(input.jobDescription ?? "").slice(0, 2500)}\n` +
            `RESUME STRENGTHS: ${(input.skillsFound ?? []).join(", ") || "n/a"}\n` +
            `GAPS TO PROBE: ${(input.skillsMissing ?? []).join(", ") || "n/a"}\n` +
            (seed ? `PRIORITIZE THESE GAP QUESTIONS:\n${seed}\n` : "") +
            `\nReturn JSON: {"questions":[{"question":"...","competency":"..."}]} with exactly ${count} questions, ordered easy -> hard.`,
        },
      ],
      { maxTokens: 1200 }
    );
    const qs = Array.isArray(res?.questions) ? res.questions : [];
    const cleaned = qs
      .map((q) => ({ question: String(q?.question ?? "").trim(), competency: String(q?.competency ?? "General").trim() }))
      .filter((q) => q.question)
      .slice(0, count);
    if (cleaned.length) return cleaned;
  } catch {
    // fall through to a sensible default set
  }
  return [
    { question: `Walk me through a project most relevant to the ${input.jobTitle} role.`, competency: "Experience" },
    { question: "What was the hardest technical problem you solved there, and how?", competency: "Problem solving" },
    { question: "How do you make sure your work is correct and reliable?", competency: "Quality" },
    { question: "Tell me about a time you disagreed with a teammate. What happened?", competency: "Collaboration" },
    { question: "What part of this role are you least experienced in, and how would you ramp up?", competency: "Self-awareness" },
    { question: "Why this role, and what do you want to learn next?", competency: "Motivation" },
  ].slice(0, count);
}

/**
 * Scores a completed interview transcript with an LLM-as-judge, constrained to the
 * questions that were actually asked (no hallucinated questions; "Not answered" when
 * the candidate didn't respond). Returns a structured, defensible score.
 */
export async function scoreInterviewTranscript(input: {
  jobTitle: string;
  questions: InterviewQuestion[];
  transcript: TranscriptTurn[];
}): Promise<InterviewScore> {
  const qList = input.questions.map((q, i) => `${i + 1}. (${q.competency}) ${q.question}`).join("\n");
  const convo = input.transcript
    .map((t) => `${t.role === "ai" ? "INTERVIEWER" : "CANDIDATE"}: ${t.text}`)
    .join("\n");

  const raw = await chatJSON<Partial<InterviewScore>>(
    [
      {
        role: "system",
        content:
          "You are a fair, rigorous interview evaluator. Score ONLY against the listed questions/competencies. " +
          "If a question wasn't answered, mark it 'Not answered' and score it low. Be evidence-based; ignore name, age, origin. " +
          "Think before scoring. Return ONLY JSON.",
      },
      {
        role: "user",
        content:
          `ROLE: ${input.jobTitle}\n\nQUESTIONS:\n${qList}\n\nTRANSCRIPT:\n${convo}\n\n` +
          'Return JSON: {"overall_score":0-100,"recommendation":"advance|hold|reject","summary":"3-4 sentences",' +
          '"strengths":["..."],"concerns":["..."],"per_question":[{"question":"...","score":0-100,"feedback":"..."}]}',
      },
    ],
    { maxTokens: 1800 }
  );

  return {
    overall_score: clamp(raw.overall_score),
    recommendation: (["advance", "hold", "reject"].includes(String(raw.recommendation))
      ? raw.recommendation
      : "hold") as InterviewScore["recommendation"],
    summary: typeof raw.summary === "string" ? raw.summary : "",
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String).slice(0, 10) : [],
    concerns: Array.isArray(raw.concerns) ? raw.concerns.map(String).slice(0, 10) : [],
    per_question: Array.isArray(raw.per_question)
      ? raw.per_question
          .map((p) => ({
            question: String((p as { question?: string })?.question ?? ""),
            score: clamp((p as { score?: number })?.score),
            feedback: String((p as { feedback?: string })?.feedback ?? ""),
          }))
          .slice(0, 20)
      : [],
  };
}
