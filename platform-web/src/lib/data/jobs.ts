"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { revalidatePath } from "next/cache";
import { demoJobs } from "./demo";

export type JobStatus = "draft" | "open" | "paused" | "closed";

export async function listJobs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  return data?.length ? data : demoJobs;
}

export async function getJob(id: string) {
  if (id.startsWith("demo-")) return demoJobs.find((job) => job.id === id) ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  return data ?? demoJobs.find((job) => job.id === id) ?? null;
}

export type CreateJobInput = {
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  requirements: string[];
  status: JobStatus;
};

export async function createJob(input: CreateJobInput) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No organization");
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...input, organization_id: orgId, created_by: user!.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/jobs");
  return data.id as string;
}

export async function updateJob(id: string, patch: Partial<CreateJobInput>) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/jobs/${id}`);
  revalidatePath("/dashboard/jobs");
}

export async function closeJob(id: string) {
  await updateJob(id, { status: "closed" });
}
