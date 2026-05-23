"use client"

import { BarChart3, Clock, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { mockAnalytics } from "@/lib/mockData";
import { PageHeader, StatCard, SectionCard, PreviewBanner } from "@/components";

export default function AnalyticsPage() {
    const maxStage = Math.max(...mockAnalytics.pipeline_stats.map(s => s.value));

    return (
        <div className="p-8 space-y-8">
            <PreviewBanner />
            <PageHeader
                title="Recruiting Analytics"
                subtitle="Measure speed, quality, source ROI, bottlenecks, and AI screening impact."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                <StatCard
                    icon={<Clock />}
                    value={String(mockAnalytics.avg_time_to_hire)}
                    label="Time to Hire"
                    tone="neutral"
                />
                <StatCard
                    icon={<TrendingUp />}
                    value="53%"
                    label="Offer Acceptance"
                    tone="success"
                />
                <StatCard
                    icon={<Users />}
                    value={String(mockAnalytics.total_candidates)}
                    label="Candidates"
                    tone="accent"
                />
                <StatCard
                    icon={<BarChart3 />}
                    value="41%"
                    label="AI Pass Rate"
                    tone="warning"
                />
                <StatCard
                    icon={<ShieldAlert />}
                    value={String(mockAnalytics.sla_risks)}
                    label="SLA Risks"
                    tone="danger"
                />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <SectionCard title="Pipeline Conversion">
                    <div className="space-y-4">
                        {mockAnalytics.pipeline_stats.map((stat) => (
                            <div key={stat.name}>
                                <div className="mb-1 flex justify-between text-sm font-medium">
                                    <span className="text-ink-2">{stat.name}</span>
                                    <span className="text-ink">{stat.value}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                                    <div
                                        className="h-full rounded-full bg-accent"
                                        style={{ width: `${(stat.value / maxStage) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title="Source Quality">
                    <div className="space-y-4">
                        {mockAnalytics.source_performance.map(source => (
                            <div key={source.source} className="rounded-card border border-border-card p-4">
                                <div className="mb-2 flex justify-between">
                                    <span className="font-medium text-ink">{source.source}</span>
                                    <span className="font-bold text-success-soft-ink">{source.quality}%</span>
                                </div>
                                <p className="text-sm text-ink-3">{source.candidates} candidates reviewed</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
