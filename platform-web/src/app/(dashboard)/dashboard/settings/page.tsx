"use client";

import { useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
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

const TABS = ["Organization", "Team Members", "Integrations"];

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

            {activeTab === "Team Members" && (
                <Card>
                    <p className="text-ink-2 text-[13px]">Team Members management coming in Slice 2.</p>
                </Card>
            )}

            {activeTab === "Integrations" && (
                <Card>
                    <p className="text-ink-2 text-[13px]">Integrations management coming in Slice 2.</p>
                </Card>
            )}
        </div>
    );
}
