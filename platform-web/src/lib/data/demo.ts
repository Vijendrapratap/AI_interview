import type { DashboardData } from "./dashboard";
import type { Stage } from "./application-types";

const now = "2026-05-24T06:00:00.000Z";

export const demoJobs = [
  {
    id: "demo-job-backend",
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Remote / Bengaluru",
    employment_type: "full_time",
    salary_min: 2800000,
    salary_max: 4200000,
    currency: "INR",
    status: "open",
    created_at: "2026-05-20T09:00:00.000Z",
    description:
      "Own scalable APIs, PostgreSQL data models, and AI screening workflows for a fast-growing recruitment platform.",
    requirements: ["Python", "FastAPI", "PostgreSQL", "System design", "AI product experience"],
  },
  {
    id: "demo-job-product",
    title: "Product Designer",
    department: "Design",
    location: "Hybrid / Mumbai",
    employment_type: "full_time",
    salary_min: 1800000,
    salary_max: 3000000,
    currency: "INR",
    status: "open",
    created_at: "2026-05-18T09:00:00.000Z",
    description:
      "Design clean recruiter workflows, scorecards, dashboards, and candidate communication experiences.",
    requirements: ["Figma", "UX research", "Design systems", "SaaS dashboards"],
  },
  {
    id: "demo-job-recruiter",
    title: "Recruiter Operations Lead",
    department: "People",
    location: "Remote / India",
    employment_type: "contract",
    salary_min: 1200000,
    salary_max: 2200000,
    currency: "INR",
    status: "open",
    created_at: "2026-05-15T09:00:00.000Z",
    description:
      "Run hiring operations, maintain pipeline hygiene, and use AI recommendations to accelerate shortlisting.",
    requirements: ["Talent acquisition", "ATS hygiene", "Stakeholder management", "Analytics"],
  },
];

export const demoCandidates = [
  {
    id: "demo-cand-arjun",
    full_name: "Arjun Singh",
    email: "arjun.singh@example.com",
    phone: "+91 90000 11111",
    current_role: "Senior Python Engineer",
    current_company: "CloudScale Labs",
    source: "LinkedIn",
    created_at: "2026-05-23T10:30:00.000Z",
    applications: [
      {
        id: "demo-app-arjun",
        stage: "interview",
        ai_score: 91,
        analysis_status: "complete",
        recommendation: "Strong match: FastAPI, PostgreSQL, and system design depth. Send technical interview invite.",
        job_id: "demo-job-backend",
        candidate_id: "demo-cand-arjun",
        created_at: "2026-05-23T10:30:00.000Z",
        updated_at: now,
        jobs: { id: "demo-job-backend", title: "Senior Backend Engineer" },
        candidates: { id: "demo-cand-arjun", full_name: "Arjun Singh", email: "arjun.singh@example.com", current_role: "Senior Python Engineer" },
      },
    ],
  },
  {
    id: "demo-cand-meera",
    full_name: "Meera Kapoor",
    email: "meera.kapoor@example.com",
    phone: "+91 90000 22222",
    current_role: "Product Designer",
    current_company: "Fintech Studio",
    source: "Referral",
    created_at: "2026-05-22T13:00:00.000Z",
    applications: [
      {
        id: "demo-app-meera",
        stage: "screening",
        ai_score: 86,
        analysis_status: "complete",
        recommendation: "Strong portfolio and SaaS dashboard work. Request design systems case study.",
        job_id: "demo-job-product",
        candidate_id: "demo-cand-meera",
        created_at: "2026-05-22T13:00:00.000Z",
        updated_at: now,
        jobs: { id: "demo-job-product", title: "Product Designer" },
        candidates: { id: "demo-cand-meera", full_name: "Meera Kapoor", email: "meera.kapoor@example.com", current_role: "Product Designer" },
      },
    ],
  },
  {
    id: "demo-cand-nikhil",
    full_name: "Nikhil Rao",
    email: "nikhil.rao@example.com",
    phone: "+91 90000 33333",
    current_role: "Recruiting Coordinator",
    current_company: "PeopleOps Co.",
    source: "Job board",
    created_at: "2026-05-21T16:20:00.000Z",
    applications: [
      {
        id: "demo-app-nikhil",
        stage: "new",
        ai_score: 73,
        analysis_status: "complete",
        recommendation: "Possible fit. Good coordination experience, needs deeper analytics proof.",
        job_id: "demo-job-recruiter",
        candidate_id: "demo-cand-nikhil",
        created_at: "2026-05-21T16:20:00.000Z",
        updated_at: now,
        jobs: { id: "demo-job-recruiter", title: "Recruiter Operations Lead" },
        candidates: { id: "demo-cand-nikhil", full_name: "Nikhil Rao", email: "nikhil.rao@example.com", current_role: "Recruiting Coordinator" },
      },
    ],
  },
  {
    id: "demo-cand-sofia",
    full_name: "Sofia Mendes",
    email: "sofia.mendes@example.com",
    phone: "+91 90000 44444",
    current_role: "Talent Acquisition Lead",
    current_company: "ScaleHire",
    source: "Inbound application",
    created_at: "2026-05-20T11:45:00.000Z",
    applications: [
      {
        id: "demo-app-sofia",
        stage: "offer",
        ai_score: 94,
        analysis_status: "complete",
        recommendation: "Exceptional operations background. Prepare offer and hiring manager summary.",
        job_id: "demo-job-recruiter",
        candidate_id: "demo-cand-sofia",
        created_at: "2026-05-20T11:45:00.000Z",
        updated_at: now,
        jobs: { id: "demo-job-recruiter", title: "Recruiter Operations Lead" },
        candidates: { id: "demo-cand-sofia", full_name: "Sofia Mendes", email: "sofia.mendes@example.com", current_role: "Talent Acquisition Lead" },
      },
    ],
  },
];

export const demoApplications = demoCandidates.flatMap((candidate) => candidate.applications);

export function getDemoDashboardData(): DashboardData {
  const activeApps = demoApplications.filter((app) => app.stage !== "rejected" && app.stage !== "hired");
  return {
    needsReview: demoApplications.filter((app) => app.stage === "new").length,
    slaRisks: 1,
    interviewsPending: demoApplications.filter((app) => app.stage === "interview").length,
    offersPending: demoApplications.filter((app) => app.stage === "offer").length,
    priorityQueue: activeApps
      .slice()
      .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
      .map((app) => ({
        id: app.id,
        candidate_id: app.candidate_id,
        candidate_name: app.candidates.full_name,
        job_title: app.jobs.title,
        ai_score: app.ai_score,
        stage: app.stage,
        analysis_status: app.analysis_status,
      })),
    activeJobs: demoJobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      created_at: job.created_at,
      applicants: demoApplications.filter((app) => app.job_id === job.id).length,
    })),
    totals: { jobs: demoJobs.length, candidates: demoCandidates.length },
  };
}

export function getDemoPipeline() {
  const grouped: Record<Stage, typeof demoApplications> = {
    new: [],
    screening: [],
    interview: [],
    offer: [],
    hired: [],
    rejected: [],
  };
  for (const app of demoApplications) grouped[(app.stage as Stage) || "new"].push(app);
  return grouped;
}

export function getDemoCandidate(id: string) {
  return demoCandidates.find((candidate) => candidate.id === id) ?? null;
}

export function getDemoAnalysis() {
  return {
    id: "demo-analysis",
    resume_id: "demo-resume",
    overall_score: 88,
    breakdown: { Experience: 90, Skills: 86, ATS: 92, Communication: 84 },
    skills_found: ["Python", "FastAPI", "PostgreSQL", "System Design", "API Design"],
    skills_missing: ["Kubernetes"],
    red_flags: [],
    summary:
      "Strong candidate for a recruiter-reviewed shortlist. The profile matches core role requirements and has clear delivery evidence.",
  };
}

export const demoResume = {
  id: "demo-resume",
  file_name: "demo-resume.pdf",
  uploaded_at: now,
};
