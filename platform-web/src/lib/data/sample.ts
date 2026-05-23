"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard/pipeline");
}

// ---------------------------------------------------------------------------
// loadSampleData
// ---------------------------------------------------------------------------

export async function loadSampleData(): Promise<{
  jobs: number;
  candidates: number;
  applications: number;
}> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization — cannot load sample data.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // ---- 1. Insert 3 sample jobs ----
  const jobRows = [
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Senior Product Designer",
      department: "Design",
      location: "New York, NY",
      employment_type: "full_time",
      salary_min: 115000,
      salary_max: 155000,
      status: "open",
      description:
        "Lead end-to-end design for our recruiter-facing product. Own the design system, run user research sessions, and partner closely with engineering to ship polished, accessible experiences.",
      requirements: [
        "__sample-data__",
        "5+ years of product design experience",
        "Figma expert with prototyping depth",
        "Experience with design systems at scale",
      ],
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Backend Engineer",
      department: "Engineering",
      location: "Remote",
      employment_type: "full_time",
      salary_min: 140000,
      salary_max: 185000,
      status: "open",
      description:
        "Build the APIs and data pipelines that power our AI recruitment platform. You will design scalable services in Python/FastAPI, optimise PostgreSQL queries, and collaborate with the ML team on resume analysis features.",
      requirements: [
        "__sample-data__",
        "3+ years Python backend experience",
        "Strong PostgreSQL and SQL optimisation skills",
        "Familiarity with REST API design and async patterns",
      ],
    },
    {
      organization_id: orgId,
      created_by: user.id,
      title: "Recruiter Operations Manager",
      department: "People",
      location: "Chicago, IL",
      employment_type: "full_time",
      salary_min: 95000,
      salary_max: 125000,
      status: "open",
      description:
        "Own the recruiting operations function: manage ATS hygiene, build sourcing workflows, analyse pipeline metrics, and coach a team of recruiters to hit hiring targets on time.",
      requirements: [
        "__sample-data__",
        "4+ years in recruiting operations or talent acquisition",
        "Experience with ATS administration (Greenhouse, Lever, or similar)",
        "Data-driven approach to pipeline reporting",
      ],
    },
  ];

  const { data: insertedJobs, error: jobsError } = await supabase
    .from("jobs")
    .insert(jobRows)
    .select("id");
  if (jobsError) throw new Error(`Sample jobs insert failed: ${jobsError.message}`);

  const [designJobId, engJobId, opsJobId] = (insertedJobs ?? []).map((j) => j.id as string);

  // ---- 2. Insert 6 sample candidates ----
  const candidateRows = [
    {
      organization_id: orgId,
      full_name: "Priya Nair",
      email: "priya.nair@example-sample.com",
      current_role: "Product Designer",
      current_company: "Fintech Startup",
      source: "sample",
    },
    {
      organization_id: orgId,
      full_name: "Marcus Thompson",
      email: "marcus.thompson@example-sample.com",
      current_role: "Senior UX Designer",
      current_company: "SaaS Co.",
      source: "sample",
    },
    {
      organization_id: orgId,
      full_name: "Anya Petrova",
      email: "anya.petrova@example-sample.com",
      current_role: "Backend Engineer",
      current_company: "Cloud Infra Ltd.",
      source: "sample",
    },
    {
      organization_id: orgId,
      full_name: "Jamal Carter",
      email: "jamal.carter@example-sample.com",
      current_role: "Software Engineer",
      current_company: "E-Commerce Platform",
      source: "sample",
    },
    {
      organization_id: orgId,
      full_name: "Sofia Mendez",
      email: "sofia.mendez@example-sample.com",
      current_role: "Talent Acquisition Lead",
      current_company: "Global Staffing Inc.",
      source: "sample",
    },
    {
      organization_id: orgId,
      full_name: "David Kim",
      email: "david.kim@example-sample.com",
      current_role: "Recruiting Operations Specialist",
      current_company: "HR Tech Corp",
      source: "sample",
    },
  ];

  const { data: insertedCandidates, error: candidatesError } = await supabase
    .from("candidates")
    .insert(candidateRows)
    .select("id");
  if (candidatesError)
    throw new Error(`Sample candidates insert failed: ${candidatesError.message}`);

  const [priyaId, marcusId, anyaId, jamalId, sofiaId, davidId] = (insertedCandidates ?? []).map(
    (c) => c.id as string,
  );

  // ---- 3. Insert 6 applications spread across stages ----
  const applicationRows = [
    // Design job: 2 applications
    {
      organization_id: orgId,
      job_id: designJobId,
      candidate_id: priyaId,
      stage: "screening",
      ai_score: 88,
      recommendation: "Strong fit — matches all core design requirements",
      analysis_status: "complete",
    },
    {
      organization_id: orgId,
      job_id: designJobId,
      candidate_id: marcusId,
      stage: "offer",
      ai_score: 92,
      recommendation: "Excellent portfolio depth; move to offer",
      analysis_status: "complete",
    },
    // Engineering job: 2 applications
    {
      organization_id: orgId,
      job_id: engJobId,
      candidate_id: anyaId,
      stage: "interview",
      ai_score: 85,
      recommendation: "Solid follow-up — strong Python and PostgreSQL background",
      analysis_status: "complete",
    },
    {
      organization_id: orgId,
      job_id: engJobId,
      candidate_id: jamalId,
      stage: "new",
      ai_score: 71,
      recommendation: "Worth reviewing — some gaps in async patterns",
      analysis_status: "complete",
    },
    // Ops job: 2 applications
    {
      organization_id: orgId,
      job_id: opsJobId,
      candidate_id: sofiaId,
      stage: "hired",
      ai_score: 95,
      recommendation: "Exceptional recruiter operations background — hire",
      analysis_status: "complete",
    },
    {
      organization_id: orgId,
      job_id: opsJobId,
      candidate_id: davidId,
      stage: "rejected",
      ai_score: 58,
      recommendation: "Role mismatch — insufficient ATS administration depth",
      analysis_status: "complete",
    },
  ];

  const { data: insertedApps, error: appsError } = await supabase
    .from("applications")
    .insert(applicationRows)
    .select("id");
  if (appsError) throw new Error(`Sample applications insert failed: ${appsError.message}`);

  revalidateAll();

  return {
    jobs: insertedJobs?.length ?? 0,
    candidates: insertedCandidates?.length ?? 0,
    applications: insertedApps?.length ?? 0,
  };
}

// ---------------------------------------------------------------------------
// clearSampleData
// ---------------------------------------------------------------------------

export async function clearSampleData(): Promise<void> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization — cannot clear sample data.");

  // --- Find sample candidate ids ---
  const { data: sampleCandidates } = await supabase
    .from("candidates")
    .select("id")
    .eq("organization_id", orgId)
    .eq("source", "sample");
  const sampleCandidateIds = (sampleCandidates ?? []).map((c) => c.id as string);

  // --- Find sample job ids ---
  // supabase-js text[] contains operator: cs (containedBy uses cd; @> is cs)
  const { data: sampleJobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("organization_id", orgId)
    .filter("requirements", "cs", '{"__sample-data__"}');
  const sampleJobIds = (sampleJobs ?? []).map((j) => j.id as string);

  // 1. Delete applications linked to sample candidates OR sample jobs
  if (sampleCandidateIds.length > 0 || sampleJobIds.length > 0) {
    // Build separate delete queries and run both
    if (sampleCandidateIds.length > 0) {
      await supabase
        .from("applications")
        .delete()
        .in("candidate_id", sampleCandidateIds);
    }
    if (sampleJobIds.length > 0) {
      await supabase
        .from("applications")
        .delete()
        .in("job_id", sampleJobIds);
    }
  }

  // 2. Delete resumes for sample candidates
  if (sampleCandidateIds.length > 0) {
    await supabase.from("resumes").delete().in("candidate_id", sampleCandidateIds);
  }

  // 3. Delete sample candidates
  if (sampleCandidateIds.length > 0) {
    await supabase.from("candidates").delete().in("id", sampleCandidateIds);
  }

  // 4. Delete sample jobs
  if (sampleJobIds.length > 0) {
    await supabase.from("jobs").delete().in("id", sampleJobIds);
  }

  revalidateAll();
}
