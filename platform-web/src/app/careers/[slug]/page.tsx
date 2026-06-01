import Link from "next/link";
import { MapPin, Briefcase, Building2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-card border border-border-card bg-card p-8 text-center">
        <h1 className="font-serif text-2xl text-ink mb-2">{title}</h1>
        <p className="text-ink-2">{body}</p>
      </div>
    </div>
  );
}

// Public org careers page: every open role for one company. Reads via the anon
// "published" RLS policy (no login needed).
export default async function CareersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase.from("organizations").select("id, name").eq("slug", slug).maybeSingle();
  if (!org) return <Notice title="Careers page not found" body="This company careers link is invalid." />;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, department, location, employment_type, created_at")
    .eq("organization_id", org.id)
    .eq("published", true)
    .order("created_at", { ascending: false });

  const list = jobs ?? [];

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2">
          <Building2 size={15} /> {org.name}
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">Open roles</h1>
        <p className="mt-2 text-ink-2">{list.length} {list.length === 1 ? "position" : "positions"} currently hiring.</p>

        <div className="mt-8 space-y-3">
          {list.length === 0 ? (
            <p className="rounded-card border border-border-card bg-card p-8 text-center text-ink-3">No open roles right now — check back soon.</p>
          ) : (
            list.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="group flex items-center justify-between rounded-card border border-border-card bg-card p-5 transition-colors hover:border-accent"
              >
                <div>
                  <h2 className="text-lg font-semibold text-ink">{j.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-ink-2">
                    {j.location && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {j.location}</span>}
                    <span className="inline-flex items-center gap-1"><Briefcase size={13} /> {j.employment_type}</span>
                    {j.department && <span>{j.department}</span>}
                  </div>
                </div>
                <ArrowRight size={18} className="text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
