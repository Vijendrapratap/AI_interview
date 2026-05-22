"use client"

import { Mail, MessageCircle, Send } from "lucide-react";
import { mockCommunicationTemplates } from "@/lib/mockData";
import { PageHeader, Card, SectionCard, Badge, Banner } from "@/components";

export default function CommunicationsPage() {
    return (
        <div className="p-8 space-y-8">
            <Banner tone="neutral">This area is read-only for now — full functionality lands in Slice 2.</Banner>

            <PageHeader
                eyebrow="Recruiter Tools"
                title="Communication Center"
                subtitle="Templates and candidate updates that reduce repetitive recruiter admin work."
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Panel icon={<Mail />} title="Email templates" body="Interview invites, rejections, follow-ups, and feedback reminders." />
                <Panel icon={<MessageCircle />} title="Candidate status" body="Keep candidates informed without manual check-ins." />
                <Panel icon={<Send />} title="Bulk sends" body="Draft bulk updates with recruiter approval before sending." />
            </div>

            <SectionCard
                title="Recruiter Templates"
            >
                <div className="grid gap-4 md:grid-cols-2">
                    {mockCommunicationTemplates.map(template => (
                        <Card key={template.id} variant="compact">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-card-title">{template.name}</h3>
                                <Badge tone="accent">{template.status}</Badge>
                            </div>
                            <p className="text-meta">{template.use}</p>
                            <p className="mt-3 text-eyebrow">{template.channel}</p>
                        </Card>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
}

function Panel({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
    return (
        <Card variant="default">
            <div className="mb-3 text-accent">{icon}</div>
            <h2 className="text-card-title">{title}</h2>
            <p className="mt-2 text-meta">{body}</p>
        </Card>
    );
}
