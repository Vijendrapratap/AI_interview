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
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Portal
            </Link>

            {/* Report Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Detailed Reports</h1>
                <p className="text-gray-600">
                    Comprehensive analysis of your resume, interview performance, career trajectory, and skills.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <nav className="flex overflow-x-auto border-b border-gray-200">
                    {reportTabs.map((tab) => {
                        const isActive = pathname.startsWith(tab.href)
                        const Icon = tab.icon
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    isActive
                                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                                        : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                }`}
                            >
                                <Icon size={18} />
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
