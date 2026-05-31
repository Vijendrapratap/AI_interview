import { Mail, MessageCircle, Send } from "lucide-react";
import { mockCommunicationTemplates } from "@/lib/mockData";
import { PageHeader, Card, SectionCard, Badge } from "@/components";
import { listEmailDrafts } from "@/lib/data/emails";
import EmailApprovalQueue from "./EmailApprovalQueue";

export default async function CommunicationsPage() {
    const drafts = await listEmailDrafts().catch(() => []);

    return (
        <div className="p-8 space-y-8">
            <PageHeader
                eyebrow="Recruiter Tools"
                title="Communication Center"
                subtitle="AI drafts emails; you approve and send. Interview invites and stage updates land here."
            />

            <SectionCard title="Emails ready for approval">
                <EmailApprovalQueue drafts={drafts} />
            </SectionCard>

            <div className="grid gap-4 md:grid-cols-3">
                <Panel icon={<Mail />} title="Email templates" body="Interview invites, rejections, follow-ups, and feedback reminders." />
                <Panel icon={<MessageCircle />} title="Candidate status" body="Keep candidates informed without manual check-ins." />
                <Panel icon={<Send />} title="Bulk sends" body="Draft bulk updates with recruiter approval before sending." />
            </div>

            <SectionCard title="Recruiter Templates">
                <div className="grid gap-4 md:grid-cols-2">
                    {mockCommunicationTemplates.map((template) => (
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
        <Card>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-tile bg-accent-soft text-accent-soft-ink">
                {icon}
            </div>
            <h3 className="text-card-title text-ink">{title}</h3>
            <p className="mt-1 text-sm text-ink-3">{body}</p>
        </Card>
    );
}
