"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Users, Briefcase, Settings, Search, Bell, TrendingUp,
    LogOut, Kanban, CalendarClock, MessageSquare, Mail, Bot, Radar, Route
} from "lucide-react";
import { ToastProvider } from "@/components";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <div className="flex min-h-screen text-ink">
                <aside className="fixed z-10 hidden h-full w-64 border-r border-border bg-card/70 backdrop-blur-xl md:block">
                    <div className="flex h-16 items-center gap-3 border-b border-border px-6">
                        <Link href="/dashboard" className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-tile bg-accent text-sm font-black text-accent-ink">
                                R
                            </div>
                            <span className="text-[15px] font-black tracking-tight text-ink">ReCruItAI</span>
                        </Link>
                    </div>

                    <nav className="flex h-[calc(100%-4rem)] flex-col justify-between space-y-1 p-4">
                        <div className="space-y-0.5">
                            <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />}>Dashboard</NavItem>
                            <NavItem href="/dashboard/hiring-flow" icon={<Route size={18} />}>Hiring Flow</NavItem>
                            <NavItem href="/dashboard/jobs" icon={<Briefcase size={18} />}>Jobs</NavItem>
                            <NavItem href="/dashboard/pipeline" icon={<Kanban size={18} />}>Pipeline</NavItem>
                            <NavItem href="/dashboard/candidates" icon={<Users size={18} />}>Candidates</NavItem>
                            <NavItem href="/dashboard/interviews" icon={<CalendarClock size={18} />}>Interviews</NavItem>
                            <NavItem href="/dashboard/collaboration" icon={<MessageSquare size={18} />}>Collaboration</NavItem>
                            <NavItem href="/dashboard/communications" icon={<Mail size={18} />}>Comms</NavItem>
                            <NavItem href="/dashboard/sourcing" icon={<Radar size={18} />}>Sourcing</NavItem>
                            <NavItem href="/dashboard/automations" icon={<Bot size={18} />}>Automations</NavItem>
                            <NavItem href="/dashboard/analytics" icon={<TrendingUp size={18} />}>Analytics</NavItem>
                            <NavItem href="/dashboard/settings" icon={<Settings size={18} />}>Settings</NavItem>
                        </div>

                        <div className="border-t border-border pt-4">
                            <Link href="/" className="flex items-center gap-3 rounded-pill px-3 py-2 text-[13px] font-bold text-danger transition-colors hover:bg-danger-soft">
                                <LogOut size={18} />
                                Sign Out
                            </Link>
                        </div>
                    </nav>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col md:ml-64">
                    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-8 backdrop-blur-xl">
                        <div className="flex items-center gap-3 rounded-pill border border-border-card bg-card px-4 py-2 text-ink-3 shadow-card">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search candidates, jobs, actions..."
                                className="w-64 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/notifications" className="relative rounded-pill border border-border-card bg-card p-2 text-ink-2 transition-colors hover:bg-surface-muted">
                                <Bell size={18} />
                                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-pill bg-danger ring-2 ring-card" />
                            </Link>
                            <Link href="/dashboard/profile" className="block">
                                <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-accent text-[13px] font-bold text-accent-ink transition-transform hover:-translate-y-0.5">
                                    DR
                                </div>
                            </Link>
                        </div>
                    </header>

                    <main className="flex-1">{children}</main>
                </div>
            </div>
        </ToastProvider>
    );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive =
        href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname?.startsWith(href + "/");

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-pill px-3 py-2 text-[13px] font-bold transition-colors ${
                isActive ? "bg-accent-soft text-accent-soft-ink" : "text-ink-2 hover:bg-surface-muted hover:text-ink"
            }`}
        >
            {icon}
            {children}
        </Link>
    );
}
