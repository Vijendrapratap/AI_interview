"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "./organizations";
import { sendEmail } from "@/lib/email/send";
import { revalidatePath } from "next/cache";

export type EmailDraft = {
  id: string;
  to_email: string;
  subject: string;
  body_text: string | null;
  action_type: string;
  status: string;
  last_error: string | null;
  created_at: string;
};

/** Outbox rows awaiting recruiter approval (drafts) or that failed to send. */
export async function listEmailDrafts(): Promise<EmailDraft[]> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data } = await supabase
    .from("email_outbox")
    .select("id, to_email, subject, body_text, action_type, status, last_error, created_at")
    .eq("organization_id", orgId)
    .in("status", ["draft", "failed", "pending"])
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as EmailDraft[] | null) ?? [];
}

/** Approve + send selected drafts via SMTP. Updates each row's status. */
export async function sendEmails(ids: string[]): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId || ids.length === 0) return { sent: 0, failed: 0, skipped: 0 };
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("email_outbox")
    .select("id, to_email, subject, body_html, body_text")
    .eq("organization_id", orgId)
    .in("id", ids);

  let sent = 0, failed = 0, skipped = 0;
  for (const row of (rows ?? []) as Array<{ id: string; to_email: string; subject: string; body_html: string | null; body_text: string | null }>) {
    const res = await sendEmail({
      to: row.to_email,
      subject: row.subject,
      html: row.body_html ?? undefined,
      text: row.body_text ?? undefined,
    });
    if (res.sent) {
      sent++;
      await supabase
        .from("email_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: res.messageId ?? null,
          approved_by: user?.id ?? null,
          approved_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);
    } else if (res.error?.includes("not configured")) {
      skipped++;
      await supabase.from("email_outbox").update({ last_error: res.error }).eq("id", row.id);
    } else {
      failed++;
      await supabase
        .from("email_outbox")
        .update({ status: "failed", last_error: res.error ?? "send failed", retry_count: 0 })
        .eq("id", row.id);
    }
  }
  revalidatePath("/dashboard/communications");
  return { sent, failed, skipped };
}

export async function discardEmails(ids: string[]): Promise<void> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId || ids.length === 0) return;
  await supabase.from("email_outbox").update({ status: "canceled" }).eq("organization_id", orgId).in("id", ids);
  revalidatePath("/dashboard/communications");
}
