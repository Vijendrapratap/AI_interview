"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Loader2, Trash2, Copy, Check } from "lucide-react"
import { Badge } from "@/components"
import {
  inviteMember,
  setMemberRole,
  removeMember,
  revokeInvitation,
  type OrgMember,
  type Invitation,
  type OrgRole,
} from "@/lib/data/organizations"

const ROLES: OrgRole[] = ["owner", "admin", "recruiter", "hiring_manager", "interviewer"]
const INVITE_ROLES: OrgRole[] = ["admin", "recruiter", "hiring_manager", "interviewer"]

export default function TeamManager({
  members,
  invitations,
  canManage,
  myUserId,
  siteUrl,
}: {
  members: OrgMember[]
  invitations: Invitation[]
  canManage: boolean
  myUserId: string
  siteUrl: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<OrgRole>("recruiter")
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  function invite(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email.trim()) return
    startTransition(async () => {
      try {
        const token = await inviteMember(email.trim(), role)
        setInviteLink(`${siteUrl}/accept-invite?token=${token}`)
        setEmail("")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send invite")
      }
    })
  }

  return (
    <div className="space-y-8">
      {canManage && (
        <div className="rounded-card border border-border-card bg-card p-6">
          <h2 className="mb-4 font-serif text-xl text-ink">Invite a teammate</h2>
          {error && <div className="mb-3 rounded-field bg-danger-soft px-3 py-2 text-sm text-danger-soft-ink">{error}</div>}
          <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1.5 block text-[12px] font-bold text-ink-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full rounded-field border border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-ink-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as OrgRole)}
                className="rounded-field border border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                {INVITE_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus size={16} />} Send invite
            </button>
          </form>
          {inviteLink && (
            <div className="mt-4 rounded-tile border border-border-card bg-surface-muted p-3">
              <p className="mb-1 text-xs font-bold text-ink-2">Invite link (share it if the email doesn’t arrive):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all text-xs text-ink-3">{inviteLink}</code>
                <button
                  onClick={() => { navigator.clipboard?.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                  className="shrink-0 rounded-field border border-border px-2 py-1 text-xs text-ink-2 hover:bg-surface"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-card border border-border-card bg-card">
        <div className="border-b border-border-card p-4 font-semibold text-ink">Members ({members.length})</div>
        <ul className="divide-y divide-border-card">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{m.full_name || m.email || m.user_id.slice(0, 8)}</p>
                {m.email && <p className="truncate text-xs text-ink-3">{m.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.user_id !== myUserId ? (
                  <>
                    <select
                      defaultValue={m.role}
                      disabled={pending}
                      onChange={(e) =>
                        startTransition(async () => { await setMemberRole(m.user_id, e.target.value as OrgRole); router.refresh() })
                      }
                      className="rounded-field border border-border bg-card px-2 py-1.5 text-xs text-ink outline-none"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                    </select>
                    <button
                      onClick={() => startTransition(async () => { await removeMember(m.user_id); router.refresh() })}
                      disabled={pending}
                      className="rounded-field border border-border p-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger-soft-ink"
                      aria-label="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{m.role.replace(/_/g, " ")}{m.user_id === myUserId ? " · you" : ""}</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {invitations.length > 0 && (
        <div className="rounded-card border border-border-card bg-card">
          <div className="border-b border-border-card p-4 font-semibold text-ink">Pending invitations ({invitations.length})</div>
          <ul className="divide-y divide-border-card">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm text-ink">{inv.email}</p>
                  <p className="text-xs text-ink-3">{inv.role.replace(/_/g, " ")} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => startTransition(async () => { await revokeInvitation(inv.id); router.refresh() })}
                    disabled={pending}
                    className="rounded-field border border-border px-3 py-1.5 text-xs text-ink-2 hover:bg-surface-muted"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
