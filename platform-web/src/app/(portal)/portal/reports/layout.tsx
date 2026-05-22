"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, FileText, MessageSquare, TrendingUp, Target } from "lucide-react"

const reportTabs = [
    { name: "Resume Analysis", href: "/portal/reports/resume", icon: FileText },
    { name: "Interview Performance", href: "/portal/reports/interview", icon: MessageSquare },
    { name: "Career Analytics", href: "/portal/reports/career", icon: TrendingUp },
    { name: "Skills Assessment", href: "/portal/reports/skills", icon: Target },
]

export default function ReportsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="space-y-6">
            {/* Back Navigation */}
            <Link
                href="/portal"
                className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Portal
            </Link>

            {/* Report Header */}
            <div className="bg-card rounded-card shadow-card border border-border-card p-6">
                <h1 className="text-page-title text-ink mb-2">Your Detailed Reports</h1>
                <p className="text-ink-2">
                    Comprehensive analysis of your resume, interview performance, career trajectory, and skills.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-card rounded-card shadow-card border border-border-card overflow-hidden">
                <nav className="flex overflow-x-auto border-b border-border">
                    {reportTabs.map((tab) => {
                        const isActive = pathname.startsWith(tab.href)
                        const Icon = tab.icon
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap rounded-pill mx-1 my-1.5 transition-colors ${
                                    isActive
                                        ? "bg-accent-soft text-accent-soft-ink"
                                        : "text-ink-2 hover:text-ink hover:bg-surface-muted"
                                }`}
                            >
                                <Icon size={16} />
                                {tab.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Report Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
