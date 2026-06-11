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

            {activeTab === "Integrations" && <IntegrationsTab />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Premium Integrations Tab Component
// ---------------------------------------------------------------------------
import { 
    ToggleLeft, 
    ToggleRight, 
    Radio, 
    Landmark, 
    Unplug, 
    Cloud,
    Plus,
    Share2,
    Briefcase,
    CheckCircle2,
    X
} from "lucide-react";
import { 
    Textarea 
} from "@/components";
import { 
    listConnections, 
    connectPlatform, 
    disconnectPlatform, 
    addCustomPlatform, 
    type Connection 
} from "@/lib/data/connections";

function IntegrationsTab() {
    const toast = useToast();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Modals
    const [connectModal, setConnectModal] = useState<string | null>(null);
    const [mcpModal, setMcpModal] = useState(false);

    // Form inputs
    const [username, setUsername] = useState("");
    const [apiKey, setApiKey] = useState("");
    
    // Custom platform inputs
    const [customName, setCustomName] = useState("");
    const [customWebhook, setCustomWebhook] = useState("");
    const [enableMcp, setEnableMcp] = useState(false);
    const [mcpConfig, setMcpConfig] = useState("");

    // Event-handler refresh: show the loading state, then re-fetch.
    const loadData = () => {
        setLoading(true);
        listConnections()
            .then(setConnections)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        // `loading` is initialized to true, so no synchronous setState is needed on mount.
        listConnections()
            .then(setConnections)
            .finally(() => setLoading(false));
    }, []);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectModal) return;
        
        startTransition(async () => {
            await connectPlatform(connectModal, { username, apiKey });
            toast(`${connectModal} connected successfully.`);
            setConnectModal(null);
            setUsername("");
            setApiKey("");
            loadData();
        });
    };

    const handleCustomConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName || !customWebhook) return;

        startTransition(async () => {
            await addCustomPlatform(customName, customWebhook, enableMcp, mcpConfig);
            toast(`Custom platform ${customName} connected.`);
            setMcpModal(false);
            setCustomName("");
            setCustomWebhook("");
            setEnableMcp(false);
            setMcpConfig("");
            loadData();
        });
    };

    const handleDisconnect = (platform: string) => {
        if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;
        startTransition(async () => {
            await disconnectPlatform(platform);
            toast(`${platform} disconnected.`);
            loadData();
        });
    };

    const standardPlatforms = [
        { name: "LinkedIn", detail: "Publish jobs directly to LinkedIn Sourcing and sync applicants.", icon: <Share2 className="text-[#0A66C2]" size={20} /> },
        { name: "Indeed", detail: "Syndicate roles to Indeed and run high-volume screener flows.", icon: <Briefcase className="text-[#2164F3]" size={20} /> },
        { name: "Glassdoor", detail: "Share open listings and track employer reviews.", icon: <CheckCircle2 className="text-[#0CAA41]" size={20} /> },
        { name: "Naukri", detail: "Reach premium technical talent in Asia and track SLA pipelines.", icon: <Landmark className="text-[#102B7B]" size={20} /> }
    ];

    return (
        <div className="space-y-6">
            <SectionCard
                title="Platform Connections"
                subtitle="Connect your ATS with international job boards to distribute roles and collect profiles in one workspace."
                action={
                    <Button variant="primary" size="sm" onClick={() => setMcpModal(true)}>
                        <Plus size={15} /> Add Custom Platform
                    </Button>
                }
            >
                <div className="grid gap-4 md:grid-cols-2">
                    {standardPlatforms.map(platform => {
                        const conn = connections.find(c => c.platform.toLowerCase() === platform.name.toLowerCase());
                        const isConnected = !!conn;
                        return (
                            <Card key={platform.name} variant="compact" className="flex flex-col justify-between border-border border">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-card bg-surface-muted p-2">
                                            {platform.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[14px] text-ink">{platform.name}</h3>
                                            <p className="text-meta mt-0.5">{isConnected ? `Connected as ${conn.settings?.username || "Active Account"}` : "Ready to connect"}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => isConnected ? handleDisconnect(platform.name) : setConnectModal(platform.name)}
                                        className="text-ink-2 hover:text-ink transition-colors"
                                    >
                                        {isConnected ? <ToggleRight className="text-success-soft-ink" size={32} /> : <ToggleLeft size={32} />}
                                    </button>
                                </div>
                                <p className="mt-3 text-meta text-ink-3">{platform.detail}</p>
                            </Card>
                        );
                    })}
                </div>
            </SectionCard>

            <Card>
                <h3 className="text-card-title mb-4">My Custom Webhook & MCP Connections</h3>
                {loading ? (
                    <p className="text-meta">Loading custom integrations…</p>
                ) : connections.filter(c => !["linkedin", "indeed", "glassdoor", "naukri"].includes(c.platform.toLowerCase())).length === 0 ? (
                    <p className="text-meta text-ink-3 text-center py-6">No custom platforms registered. Click &ldquo;Add Custom Platform&rdquo; above to sync with a custom webhook or MCP server.</p>
                ) : (
                    <div className="divide-y divide-border-card">
                        {connections
                            .filter(c => !["linkedin", "indeed", "glassdoor", "naukri"].includes(c.platform.toLowerCase()))
                            .map(c => (
                                <div key={c.id} className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-tile bg-accent-soft p-2 text-accent-soft-ink">
                                            <Cloud size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-ink">{c.platform}</p>
                                            <p className="text-meta text-ink-3 mt-0.5">Webhook: {c.settings?.webhookUrl} {c.settings?.enableMcp && " · MCP Enabled"}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDisconnect(c.platform)}>
                                        <Unplug size={14} className="mr-1" /> Disconnect
                                    </Button>
                                </div>
                            ))}
                    </div>
                )}
            </Card>

            {/* Platform Credentials Modal */}
            {connectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-card border border-border-card bg-card shadow-card p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-card-title">Connect {connectModal}</h3>
                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <Label required>Recruiter Username / Account Email</Label>
                                <Input 
                                    type="text" 
                                    required 
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="recruiter@codesstellar.com" 
                                />
                            </div>
                            <div>
                                <Label required>OAuth Token or API Key</Label>
                                <Input 
                                    type="password" 
                                    required 
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="Enter your api key or client secret" 
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="secondary" size="sm" onClick={() => setConnectModal(null)}>Cancel</Button>
                                <Button type="submit" variant="primary" size="sm" disabled={isPending}>Connect platform</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Platform Webhook Modal */}
            {mcpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-card border border-border-card bg-card shadow-card p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-card-title">Connect Custom Platform</h3>
                                <p className="text-meta mt-1">Register a custom webhook to push job posts to an internal board or active MCP server.</p>
                            </div>
                            <button type="button" onClick={() => setMcpModal(false)} className="text-ink-3 hover:text-ink">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCustomConnect} className="space-y-4">
                            <div>
                                <Label required>Platform Name</Label>
                                <Input 
                                    type="text" 
                                    required 
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                    placeholder="e.g. Codesstellar Career Portal" 
                                />
                            </div>
                            <div>
                                <Label required>Sync Webhook URL</Label>
                                <Input 
                                    type="url" 
                                    required 
                                    value={customWebhook}
                                    onChange={e => setCustomWebhook(e.target.value)}
                                    placeholder="https://api.codesstellar.com/webhooks/jobs" 
                                />
                            </div>
                            <div className="flex items-center justify-between border border-border rounded-field p-3 bg-surface">
                                <div className="flex items-center gap-2">
                                    <Radio className="text-accent" size={16} />
                                    <div>
                                        <p className="text-xs font-bold text-ink">Enable AI Agent MCP Sync</p>
                                        <p className="text-[10px] text-ink-3">Allow Claude/Gemini to control and push to this platform via Model Context Protocol</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEnableMcp(p => !p)}
                                    className="text-ink-2"
                                >
                                    {enableMcp ? <ToggleRight className="text-accent" size={28} /> : <ToggleLeft size={28} />}
                                </button>
                            </div>
                            {enableMcp && (
                                <div>
                                    <Label>MCP Server Sync Configurations (JSON)</Label>
                                    <Textarea
                                        value={mcpConfig}
                                        onChange={e => setMcpConfig(e.target.value)}
                                        rows={3}
                                        placeholder='{ "command": "npx", "args": ["@codesstellar/mcp-server"] }'
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="secondary" size="sm" onClick={() => setMcpModal(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" size="sm" disabled={isPending}>Create custom connection</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

