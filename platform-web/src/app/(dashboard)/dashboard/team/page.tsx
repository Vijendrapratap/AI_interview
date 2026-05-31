import { PageHeader } from "@/components";
import { createClient } from "@/lib/supabase/server";
import {
  getMyRole,
  listOrgMembers,
  listInvitations,
  isPlatformAdmin,
  listRecruiterStats,
} from "@/lib/data/organizations";
import TeamManager from "./TeamManager";

export default async function TeamPage() {
  const supabase = await createClient();
  const [{ data: { user } }, role, members, invitations, platformAdmin] = await Promise.all([
    supabase.auth.getUser(),
    getMyRole(),
    listOrgMembers().catch(() => []),
    listInvitations().catch(() => []),
    isPlatformAdmin().catch(() => false),
  ]);

  const canManage = role === "owner" || role === "admin" || platformAdmin;
  const stats = canManage ? await listRecruiterStats().catch(() => []) : [];
  const nameOf = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    return m?.full_name || m?.email || uid.slice(0, 8);
  };
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://recruitai-test.vercel.app").replace(/\/$/, "");

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <PageHeader
        eyebrow="Company"
        title="Team & Recruiters"
        subtitle="Invite recruiters to your company, set their roles, and manage access."
      />
      {!canManage && (
        <div className="rounded-field bg-surface-muted px-4 py-3 text-sm text-ink-2">
          You can view your team here. Ask an owner or admin to invite or manage members.
        </div>
      )}
      {canManage && stats.length > 0 && (
        <div className="overflow-hidden rounded-card border border-border-card bg-card">
          <div className="border-b border-border-card p-4 font-semibold text-ink">Recruiter performance</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-card text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="px-4 py-3">Recruiter</th>
                <th className="px-4 py-3 text-right">Jobs</th>
                <th className="px-4 py-3 text-right">Candidates</th>
                <th className="px-4 py-3 text-right">Interviews</th>
                <th className="px-4 py-3 text-right">Hires</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.user_id} className="border-b border-border-card last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{nameOf(s.user_id)}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{s.jobs}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{s.applications}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{s.interviews}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{s.hires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TeamManager
        members={members}
        invitations={invitations}
        canManage={canManage}
        myUserId={user?.id ?? ""}
        siteUrl={siteUrl}
      />
    </div>
  );
}
