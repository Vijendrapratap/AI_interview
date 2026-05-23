"use client"

import { Search, Send, TrendingUp } from "lucide-react";
import { mockJobBoards, mockSourcingChannels } from "@/lib/mockData";
import { PageHeader, Card, SectionCard, Badge, Button, PreviewBanner } from "@/components";

export default function SourcingPage() {
    return (
        <div className="p-8 space-y-8">
            <PreviewBanner />
            <PageHeader
                eyebrow="Recruiter Tools"
                title="Sourcing & Talent Rediscovery"
                subtitle="Track channel quality and rediscover past applicants before paying for new sourcing."
            />

            <SectionCard
                title="Multi-platform posting"
                subtitle="Write one job once, then publish to the channels that fit the role."
                action={
                    <Button variant="primary" size="sm">
                        <Send size={15} /> Publish selected
                    </Button>
                }
            >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 items-stretch">
                    {mockJobBoards.map(board => (
                        <Card key={board.name} variant="compact" className="flex flex-col">
                            <div className="flex items-center justify-between">
                                <p className="text-card-title">{board.name}</p>
                                <Badge tone="success">{board.status}</Badge>
                            </div>
                            <p className="mt-3 text-meta flex-1">{board.recommendation}</p>
                            <div className="mt-4 flex items-center justify-between text-[13px]">
                                <span className="text-ink-3">Reach: {board.reach}</span>
                                <span className="font-semibold text-ink">{board.cost}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            </SectionCard>

            <Card variant="flush">
                <div className="flex items-center gap-3 border-border-card border px-4 py-3 rounded-card mx-5 my-5">
                    <Search className="text-ink-3" size={18} />
                    <input className="w-full outline-none bg-transparent text-ink placeholder:text-ink-3 text-[13px]" placeholder="Semantic search: Senior Python engineer with AWS and FastAPI..." />
                </div>
                <p className="text-meta px-5 pb-5">Search is mocked for now; backend semantic candidate rediscovery is the next persistence milestone.</p>
            </Card>

            <SectionCard title="Source Quality">
                <div className="divide-y divide-border-card -mx-5 -mb-5">
                    {mockSourcingChannels.map(source => (
                        <div key={source.source} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="font-semibold text-ink">{source.source}</p>
                                <p className="text-meta">{source.recommendation}</p>
                            </div>
                            <div className="flex items-center gap-5 text-[13px]">
                                <span className="text-ink-3">{source.volume} candidates</span>
                                <span className="flex items-center gap-1 font-semibold text-success-soft-ink"><TrendingUp size={16} /> {source.quality}% quality</span>
                                <span className="text-ink-3">{source.cost}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
}
