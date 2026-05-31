"use client"

import { useState } from "react"
import { Loader2, CheckCircle, UploadCloud } from "lucide-react"

export default function ApplyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("submitting")
    setError("")
    const form = new FormData(e.currentTarget)
    form.set("job_id", jobId)
    try {
      const res = await fetch("/api/public/apply", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.")
      setStatus("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.")
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-card border border-border-card bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-pill bg-success-soft text-success-soft-ink">
          <CheckCircle size={28} />
        </div>
        <h2 className="font-serif text-2xl text-ink mb-2">Application received</h2>
        <p className="text-ink-2">
          Thanks for applying to <b>{jobTitle}</b>. Our team will review your resume and be in touch.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-border-card bg-card p-6">
      <h2 className="font-serif text-xl text-ink">Apply for this role</h2>
      {error && (
        <div role="alert" className="rounded-field bg-danger-soft px-3 py-2 text-sm text-danger-soft-ink">{error}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="full_name" label="Full name" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="phone" label="Phone" />
        <Field name="current_company" label="Current company" />
      </div>
      <Field name="current_role" label="Current title" />
      <div>
        <label className="mb-1.5 block text-[12px] font-bold text-ink-2">Resume (PDF) *</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-field border border-dashed border-border bg-surface-muted px-4 py-3 text-sm text-ink-2 hover:bg-surface">
          <UploadCloud size={18} />
          {fileName || "Choose a PDF file…"}
          <input
            type="file"
            name="resume"
            accept=".pdf,.doc,.docx,application/pdf"
            required
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-pill bg-accent py-3 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {status === "submitting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit application"}
      </button>
    </form>
  )
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[12px] font-bold text-ink-2">
        {label}{required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-field border border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
      />
    </div>
  )
}
