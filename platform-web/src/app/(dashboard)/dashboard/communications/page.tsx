import { AlertTriangle, Inbox, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/data/organizations";
import { sendEmails } from "@/lib/data/emails";
import { emailConfigured } from "@/lib/email/send";
import { PageHeader, SectionCard, Badge, Banner, Button, EmptyState } from "@/components";

// Columns per supabase/migrations/008_core_loop.sql (email_outbox) — RLS policy
// "org members manage outbox" already scopes rows to the recruiter's org.
type OutboxRow = {
  id: string;
  to_email: string;
  subject: string;
  body_text: string | null;
  action_type: string;
  status: string;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  candidates: { full_name: string | null } | null;
  jobs: { title: string | null } | null;
};

// Sends one draft via the existing approve+send helper (nodemailer under the
// hood). On success the row becomes status='sent' (+sent_at); on failure or
// when SMTP is unset the row stays a draft and last_error explains why.
async function sendDraftAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await sendEmails([id]);
  } catch (e) {
    console.error("[sendDraft] failed", e);
  }
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "draft" || status === "pending" || status === "sending") return "warning";
  return "neutral";
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function listOutbox(): Promise<OutboxRow[]> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data } = await supabase
    .from("email_outbox")
    .select(
      "id, to_email, subject, body_text, action_type, status, last_error, sent_at, created_at, candidates(full_name), jobs(title)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as OutboxRow[] | null) ?? [];
}

export default async function CommunicationsPage() {
  const rows = await listOutbox();
  const smtpReady = emailConfigured();
  const draftCount = rows.filter((r) => r.status === "draft" || r.status === "failed").length;

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        eyebrow="Recruiter Tools"
        title="Communication Center"
        subtitle="Every interview invite and candidate email drafts here first. Review, then send."
      />

      {!smtpReady && (
        <Banner tone="warning" icon={<AlertTriangle size={16} />}>
          Email sending is not configured yet — set SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM in
          Vercel. Drafts are saved and can be sent once configured.
        </Banner>
      )}

      <SectionCard
        title="Email outbox"
        subtitle={
          rows.length === 0
            ? "Latest 50 emails for your organization."
            : `Latest ${rows.length} emails · ${draftCount} awaiting send.`
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<Inbox size={22} />}
            title="No emails yet"
            description="Drafts appear here when you send interview invites or candidate updates."
          />
        ) : (
          <ul className="divide-y divide-border-card">
            {rows.map((row) => {
              const canSend = row.status === "draft" || row.status === "failed";
              const context = [row.candidates?.full_name, row.jobs?.title]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={row.id} className="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{row.subject}</span>
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      <Badge tone="neutral">{row.action_type.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-3">
                      To: {row.to_email}
                      {context && <> · {context}</>}
                      {" · "}
                      {row.status === "sent" && row.sent_at
                        ? `Sent ${formatWhen(row.sent_at)}`
                        : `Drafted ${formatWhen(row.created_at)}`}
                    </p>
                    {row.last_error && row.status !== "sent" && (
                      <p className="mt-1 text-xs font-medium text-danger-soft-ink">
                        Not sent: {row.last_error}
                      </p>
                    )}
                    {row.body_text && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-ink-2 hover:text-ink">
                          Preview email
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap rounded-card border border-border-card bg-surface-muted p-3 font-sans text-sm text-ink-2">
                          {row.body_text}
                        </pre>
                      </details>
                    )}
                  </div>
                  {canSend && (
                    <form action={sendDraftAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" size="sm">
                        <Send size={13} /> {row.status === "failed" ? "Retry send" : "Send"}
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
