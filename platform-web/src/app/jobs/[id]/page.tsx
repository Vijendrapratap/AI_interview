import { MapPin, Briefcase, Building2 } from "lucide-react";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import ApplyForm from "./ApplyForm";

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

// Public, shareable job + apply page. status='open' == published.
export default async function PublicJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasServiceRole()) {
    return <Notice title="Careers page not enabled yet" body="This job link will be available once setup is complete." />;
  }

  const supabase = createAdminClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, organization_id, title, department, location, employment_type, salary_min, salary_max, currency, description, requirements, status")
    .eq("id", id)
    .maybeSingle();

  if (!job || job.status !== "open") {
    return <Notice title="Position not available" body="This role isn't accepting applications right now." />;
  }

  const { data: org } = await supabase.from("organizations").select("name").eq("id", job.organization_id).maybeSingle();
  const salary =
    job.salary_min && job.salary_max
      ? `${job.currency ?? "USD"} ${Number(job.salary_min).toLocaleString()}–${Number(job.salary_max).toLocaleString()}`
      : null;
  const requirements = (Array.isArray(job.requirements) ? job.requirements : []) as string[];

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2">
          <Building2 size={15} /> {org?.name ?? "Careers"}
        </p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">{job.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-2">
          {job.location && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {job.location}</span>}
          <span className="inline-flex items-center gap-1"><Briefcase size={14} /> {job.employment_type}</span>
          {job.department && <span>{job.department}</span>}
          {salary && <span>{salary}</span>}
        </div>

        {job.description && (
          <div className="mt-8 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{job.description}</div>
        )}

        {requirements.length > 0 && (
          <div className="mt-8">
            <h2 className="font-serif text-xl text-ink mb-3">What we're looking for</h2>
            <ul className="space-y-2">
              {requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[15px] text-ink-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10">
          <ApplyForm jobId={job.id} jobTitle={job.title} />
        </div>
      </div>
    </div>
  );
}
