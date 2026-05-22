"use client";

import { useState, useEffect, useTransition } from "react";
import { Save, ShieldCheck, UserPlus } from "lucide-react";
import { mockEnterpriseControls } from "@/lib/mockData";
import {
    PageHeader,
    Card,
    SectionCard,
    Button,
    Tabs,
    Badge,
    Label,
    Input,
    Select,
    useToast,
} from "@/components";
import { listMembers, inviteMember, type OrgRole } from "@/lib/data/organizations";

const TABS = ["Organization", "Team Members", "Integrations"];

const ORG_ROLES: { value: OrgRole; label: string }[] = [
    { value: "recruiter", label: "Recruiter" },
    { value: "hiring_manager", label: "Hiring Manager" },
    { value: "interviewer", label: "Interviewer" },
    { value: "admin", label: "Admin" },
];

type Member = { user_id: string; role: string; created_at: string };

function TeamMembersTab() {
    const toast = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<OrgRole>("recruiter");
    const [isPending, startTransition] = useTransition();
    const [inviteError, setInviteError] = useState("");

    useEffect(() => {
        listMembers()
            .then((data) => setMembers(data as Member[]))
            .finally(() => setLoadingMembers(false));
    }, []);

    function handleInvite(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setInviteError("");
        startTransition(async () => {
            try {
                const token = await inviteMember(inviteEmail, inviteRole);
                const link = `${window.location.origin}/accept-invite?token=${token}`;
                toast(`Invite link: ${link}`);
                setInviteEmail("");
                // Refresh member list
                const updated = await listMembers();
                setMembers(updated as Member[]);
            } catch (err) {
                setInviteError(err instanceof Error ? err.message : "Failed to send invite");
            }
        });
    }

    return (
        <div className="space-y-6">
            <SectionCard
                title="Invite a team member"
                subtitle="Send an invitation link to add someone to your organization."
            >
                {inviteError && (
                    <div role="alert" aria-live="polite" className="mb-4 text-danger text-sm">
                        {inviteError}
                    </div>
                )}
                <form onSubmit={handleInvite} className="flex items-end gap-3">
                    <div className="flex-1">
                        <Label>Email address</Label>
                        <Input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                        />
                    </div>
                    <div className="w-44">
                        <Label>Role</Label>
                        <Select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                        >
                            {ORG_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <Button variant="primary" type="submit" disabled={isPending}>
                        <UserPlus size={16} />
                        {isPending ? "Sending…" : "Send invite"}
                    </Button>
                </form>
            </SectionCard>

            <Card>
                <h2 className="text-card-title mb-4">Current members</h2>
                {loadingMembers ? (
                    <p className="text-ink-2 text-[13px]">Loading members…</p>
                ) : members.length === 0 ? (
                    <p className="text-ink-2 text-[13px]">No members yet.</p>
                ) : (
                    <div className="space-y-2">
                        {members.map((m) => (
                            <div
                                key={m.user_id}
                                className="flex items-center justify-between rounded-field border border-border px-4 py-3"
                            >
                                <span className="text-[13px] font-medium text-ink">{m.user_id}</span>
                                <Badge tone="neutral">{m.role}</Badge>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("Organization");
    const toast = useToast();

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <PageHeader
                eyebrow="Settings"
                title="Organization Settings"
                subtitle="Manage your organization preferences and enterprise controls."
            />

            <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

            {activeTab === "Organization" && (
                <div className="space-y-6">
                    <SectionCard
                        title="Organization Profile"
                        subtitle="Basic information about your company."
                    >
                        <div className="space-y-4">
                            <div>
                                <Label>Company Name</Label>
                                <Input type="text" defaultValue="Acme Corp" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Industry</Label>
                                    <Select defaultValue="Technology">
                                        <option>Technology</option>
                                        <option>Finance</option>
                                        <option>Healthcare</option>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Size</Label>
                                    <Select defaultValue="1-50 employees">
                                        <option>1-50 employees</option>
                                        <option>51-200 employees</option>
                                        <option>200+ employees</option>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Website</Label>
                                <Input type="url" defaultValue="https://acmecorp.com" />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button
                                variant="primary"
                                onClick={() => toast("Settings saved")}
                            >
                                <Save size={16} />
                                Save Changes
                            </Button>
                        </div>
                    </SectionCard>

                    <Card>
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-card bg-success-soft p-2 text-success-soft-ink">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h2 className="text-card-title">Enterprise controls</h2>
                                <p className="text-meta">Keep the recruiter UX simple while enterprise controls run quietly underneath.</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {mockEnterpriseControls.map(control => (
                                <Card key={control.area} variant="compact">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[13px] font-semibold text-ink">{control.area}</p>
                                        <Badge tone="neutral">{control.status}</Badge>
                                    </div>
                                    <p className="mt-2 text-meta">{control.detail}</p>
                                </Card>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === "Team Members" && <TeamMembersTab />}

            {activeTab === "Integrations" && (
                <Card>
                    <p className="text-ink-2 text-[13px]">Integrations management coming in Slice 2.</p>
                </Card>
            )}
        </div>
    );
}
