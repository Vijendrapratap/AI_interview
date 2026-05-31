import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/data/organizations";

type Row = {
  org_id: string;
  org_name: string;
  created_at: string;
  members: number;
  jobs: number;
  candidates: number;
  applications: number;
  interviews: number;
};

export default async function PlatformAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isPlatformAdmin())) redirect("/dashboard");

  const { data } = await supabase.rpc("platform_overview");
  const rows = ((data as Row[] | null) ?? []).map((r) => ({
    ...r,
    members: Number(r.members),
    jobs: Number(r.jobs),
    candidates: Number(r.candidates),
    applications: Number(r.applications),
    interviews: Number(r.interviews),
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      members: acc.members + r.members,
      jobs: acc.jobs + r.jobs,
      candidates: acc.candidates + r.candidates,
      applications: acc.applications + r.applications,
      interviews: acc.interviews + r.interviews,
    }),
    { members: 0, jobs: 0, candidates: 0, applications: 0, interviews: 0 }
  );

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <p className="text-eyebrow text-accent">Pratap AI · Platform</p>
        <h1 className="font-serif text-4xl tracking-tight text-ink">Super-admin console</h1>
        <p className="mt-2 text-ink-2">Cross-organization view of every company on ReCruItAI.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-6">
          <Stat label="Companies" value={rows.length} />
          <Stat label="Members" value={totals.members} />
          <Stat label="Jobs" value={totals.jobs} />
          <Stat label="Candidates" value={totals.candidates} />
          <Stat label="Applications" value={totals.applications} />
          <Stat label="Interviews" value={totals.interviews} />
        </div>

        <div className="mt-8 overflow-hidden rounded-card border border-border-card bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-card text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3 text-right">Members</th>
                <th className="px-4 py-3 text-right">Jobs</th>
                <th className="px-4 py-3 text-right">Candidates</th>
                <th className="px-4 py-3 text-right">Applications</th>
                <th className="px-4 py-3 text-right">Interviews</th>
                <th className="px-4 py-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-3">No organizations yet.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.org_id} className="border-b border-border-card last:border-0">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium text-ink">
                        <Building2 size={15} className="text-ink-3" /> {r.org_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-2">{r.members}</td>
                    <td className="px-4 py-3 text-right text-ink-2">{r.jobs}</td>
                    <td className="px-4 py-3 text-right text-ink-2">{r.candidates}</td>
                    <td className="px-4 py-3 text-right text-ink-2">{r.applications}</td>
                    <td className="px-4 py-3 text-right text-ink-2">{r.interviews}</td>
                    <td className="px-4 py-3 text-right text-ink-3">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border-card bg-card p-4">
      <p className="text-metric text-ink">{value}</p>
      <p className="text-eyebrow mt-1 text-ink-3">{label}</p>
    </div>
  );
}
