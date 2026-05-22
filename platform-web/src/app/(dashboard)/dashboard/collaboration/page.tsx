"use client"

import { Bell, MessageSquare, Users } from "lucide-react";
import { mockCollaborationQueue } from "@/lib/mockData";
import { Avatar, Badge, Banner, Button, Card, PageHeader, SectionCard } from "@/components";

export default function CollaborationPage() {
    return (
        <div className="p-8 space-y-8">
            <Banner tone="neutral">This area is read-only for now — full functionality lands in Slice 2.</Banner>

            <PageHeader
                eyebrow="Collaboration"
                title="Hiring Team Collaboration"
                subtitle="Keep hiring managers, interviewers, and recruiters aligned on decisions."
            />

            <div className="grid gap-4 md:grid-cols-3">
                <StatMetric icon={<Users size={20} />} label="Hiring team members" value="14" />
                <StatMetric icon={<MessageSquare size={20} />} label="Pending scorecards" value="6" />
                <StatMetric icon={<Bell size={20} />} label="Overdue reminders" value="2" />
            </div>

            <SectionCard
                title="Feedback Queue"
                subtitle="Structured scorecards prevent vague feedback and speed up decisions."
            >
                <div className="divide-y divide-border-card -mx-5 -mb-5">
                    {mockCollaborationQueue.map(item => (
                        <div key={item.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="flex items-center gap-3">
                                <Avatar
                                    initials={item.candidate.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                                    size="md"
                                />
                                <div>
                                    <p className="text-card-title">{item.candidate}</p>
                                    <p className="text-meta mt-0.5">{item.role} · Reviewer: {item.reviewer}</p>
                                    <p className="text-[11px] text-ink-3 mt-0.5">Due: {item.due}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <FeedbackStatusBadge status={item.status} />
                                <Button variant="secondary" size="sm">{item.action}</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
}

function StatMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card variant="default">
            <div className="mb-3 text-accent-soft-ink">{icon}</div>
            <p className="text-meta">{label}</p>
            <p className="text-metric mt-0.5">{value}</p>
        </Card>
    );
}

function FeedbackStatusBadge({ status }: { status: string }) {
    const tone =
        status === "Overdue" ? "danger" :
        status === "Submitted" ? "success" :
        "warning";
    return <Badge tone={tone}>{status}</Badge>;
}
