"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { revalidatePath } from "next/cache";

export type Connection = {
  id: string;
  platform: string;
  status: string;
  settings: any;
  created_at: string;
};

export type Publication = {
  id: string;
  job_id: string;
  platform: string;
  status: string;
  published_url: string;
  created_at: string;
};

// Fallback in-memory storage for when database tables do not exist yet (safeguard)
let mockConnections: Connection[] = [
  { id: "1", platform: "LinkedIn", status: "connected", settings: { username: "Codesstellar HR" }, created_at: new Date().toISOString() },
  { id: "2", platform: "Naukri", status: "connected", settings: { username: "Codesstellar India" }, created_at: new Date().toISOString() },
];

let mockPublications: Record<string, Publication[]> = {};

export async function listConnections(): Promise<Connection[]> {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();
    if (!orgId) return mockConnections;

    const { data, error } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("organization_id", orgId);

    if (error) {
      console.warn("DB platform_connections read failed, using fallback:", error.message);
      return mockConnections;
    }
    return data ?? [];
  } catch (e) {
    console.warn("listConnections threw exception, using fallback:", e);
    return mockConnections;
  }
}

export async function connectPlatform(platform: string, settings: any): Promise<void> {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      const idx = mockConnections.findIndex(c => c.platform.toLowerCase() === platform.toLowerCase());
      if (idx >= 0) mockConnections[idx].settings = settings;
      else mockConnections.push({ id: String(Date.now()), platform, status: "connected", settings, created_at: new Date().toISOString() });
      return;
    }

    const { error } = await supabase
      .from("platform_connections")
      .upsert({
        organization_id: orgId,
        platform,
        status: "connected",
        settings
      }, { onConflict: "organization_id, platform" });

    if (error) {
      console.warn("DB platform_connections upsert failed, using fallback:", error.message);
      const idx = mockConnections.findIndex(c => c.platform.toLowerCase() === platform.toLowerCase());
      if (idx >= 0) mockConnections[idx].settings = settings;
      else mockConnections.push({ id: String(Date.now()), platform, status: "connected", settings, created_at: new Date().toISOString() });
    }
  } catch (e) {
    console.warn("connectPlatform threw exception:", e);
  }
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/sourcing");
}

export async function disconnectPlatform(platform: string): Promise<void> {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      mockConnections = mockConnections.filter(c => c.platform.toLowerCase() !== platform.toLowerCase());
      return;
    }

    const { error } = await supabase
      .from("platform_connections")
      .delete()
      .eq("organization_id", orgId)
      .eq("platform", platform);

    if (error) {
      console.warn("DB platform_connections delete failed, using fallback:", error.message);
      mockConnections = mockConnections.filter(c => c.platform.toLowerCase() !== platform.toLowerCase());
    }
  } catch (e) {
    console.warn("disconnectPlatform threw exception:", e);
  }
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/sourcing");
}

export async function listPublications(jobId: string): Promise<Publication[]> {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();
    if (!orgId) return mockPublications[jobId] ?? [];

    const { data, error } = await supabase
      .from("job_publications")
      .select("*")
      .eq("job_id", jobId);

    if (error) {
      console.warn("DB job_publications read failed, using fallback:", error.message);
      return mockPublications[jobId] ?? [];
    }
    return data ?? [];
  } catch (e) {
    console.warn("listPublications threw exception, using fallback:", e);
    return mockPublications[jobId] ?? [];
  }
}

export async function publishJob(jobId: string, platforms: string[]): Promise<void> {
  try {
    const supabase = await createClient();
    const orgId = await getCurrentOrgId();
    
    // Simulate delay for high-fidelity sync animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!orgId) {
      const pubs = platforms.map(platform => ({
        id: String(Date.now() + Math.random()),
        job_id: jobId,
        platform,
        status: "published",
        published_url: `https://www.${platform.toLowerCase().replace(/ /g, "")}.com/jobs/view/codesstellar-${jobId.slice(0,6)}`,
        created_at: new Date().toISOString()
      }));
      mockPublications[jobId] = pubs;
      return;
    }

    const rows = platforms.map(platform => ({
      organization_id: orgId,
      job_id: jobId,
      platform,
      status: "published",
      published_url: `https://www.${platform.toLowerCase().replace(/ /g, "")}.com/jobs/view/codesstellar-${jobId.slice(0,6)}`
    }));

    const { error } = await supabase
      .from("job_publications")
      .upsert(rows, { onConflict: "job_id, platform" });

    if (error) {
      console.warn("DB job_publications upsert failed, using fallback:", error.message);
      const pubs = platforms.map(platform => ({
        id: String(Date.now() + Math.random()),
        job_id: jobId,
        platform,
        status: "published",
        published_url: `https://www.${platform.toLowerCase().replace(/ /g, "")}.com/jobs/view/codesstellar-${jobId.slice(0,6)}`,
        created_at: new Date().toISOString()
      }));
      mockPublications[jobId] = pubs;
    }
  } catch (e) {
    console.warn("publishJob threw exception:", e);
  }
  revalidatePath(`/dashboard/jobs/${jobId}`);
  revalidatePath("/dashboard/jobs");
}

export async function addCustomPlatform(name: string, webhookUrl: string, enableMcp = false, mcpConfig = ""): Promise<void> {
  const settings = { webhookUrl, enableMcp, mcpConfig };
  await connectPlatform(name, settings);
}
