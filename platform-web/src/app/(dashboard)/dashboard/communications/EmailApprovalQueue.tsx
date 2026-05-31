"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Mail, Send, Trash2, Loader2, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components"
import { sendEmails, discardEmails, type EmailDraft } from "@/lib/data/emails"

export default function EmailApprovalQueue({ drafts }: { drafts: EmailDraft[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set(drafts.map((d) => d.id)))
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string>("")

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function approveSend() {
    const ids = [...selected]
    if (ids.length === 0) return
    startTransition(async () => {
      const r = await sendEmails(ids)
      const parts = []
      if (r.sent) parts.push(`${r.sent} sent`)
      if (r.failed) parts.push(`${r.failed} failed`)
      if (r.skipped) parts.push(`${r.skipped} held (SMTP not configured)`)
      setResult(parts.join(" · ") || "Nothing to send")
      router.refresh()
    })
  }

  function discard() {
    const ids = [...selected]
    if (ids.length === 0) return
    startTransition(async () => {
      await discardEmails(ids)
      setResult(`${ids.length} discarded`)
      router.refresh()
    })
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-card border border-border-card bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto mb-2 text-success-soft-ink" size={28} />
        <p className="text-ink-2">No emails waiting for approval. Drafts appear here when you send interviews or move candidates.</p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border-card bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-card p-4">
        <p className="text-sm font-semibold text-ink">{selected.size} selected · {drafts.length} ready for approval</p>
        <div className="flex items-center gap-2">
          {result && <span className="text-xs text-ink-3">{result}</span>}
          <button
            onClick={discard}
            disabled={pending || selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border px-3 py-2 text-sm text-ink-2 hover:bg-surface-muted disabled:opacity-50"
          >
            <Trash2 size={14} /> Discard
          </button>
          <button
            onClick={approveSend}
            disabled={pending || selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-sm font-bold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={14} />} Approve &amp; send ({selected.size})
          </button>
        </div>
      </div>
      <ul className="divide-y divide-border-card">
        {drafts.map((d) => (
          <li key={d.id} className="flex items-start gap-3 p-4">
            <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} className="mt-1" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Mail size={14} className="text-ink-3" />
                <span className="text-sm font-semibold text-ink">{d.subject}</span>
                <Badge tone="neutral">{d.action_type.replace(/_/g, " ")}</Badge>
                {d.status === "failed" && <Badge tone="danger">failed</Badge>}
              </div>
              <p className="mt-1 text-xs text-ink-3">To: {d.to_email}</p>
              {d.body_text && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-ink-2">{d.body_text}</p>}
              {d.last_error && <p className="mt-1 text-xs text-danger-soft-ink">{d.last_error}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
