"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Settings,
    Search,
    Bell,
    TrendingUp,
    LogOut,
    Kanban,
    CalendarClock,
    MessageSquare,
    Mail,
    Bot,
    Radar,
    Route
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-surface text-ink">
            <aside className="fixed z-10 hidden h-full w-64 border-r border-border bg-card/85 backdrop-blur-xl md:block">
                <div className="flex h-16 items-center gap-2 border-b border-border px-6">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-black text-surface">
                            R
                        </div>
                        <div>
                            <span className="block text-lg font-black tracking-tight text-ink">ReCruItAI</span>
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-3">ATS cockpit</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex h-[calc(100%-4rem)] flex-col justify-between space-y-1 p-4">
                    <div className="space-y-1">
                        <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />}>Dashboard</NavItem>
                        <NavItem href="/dashboard/hiring-flow" icon={<Route size={20} />}>Hiring Flow</NavItem>
                        <NavItem href="/dashboard/jobs" icon={<Briefcase size={20} />}>Jobs</NavItem>
                        <NavItem href="/dashboard/pipeline" icon={<Kanban size={20} />}>Pipeline</NavItem>
                        <NavItem href="/dashboard/candidates" icon={<Users size={20} />}>Candidates</NavItem>
                        <NavItem href="/dashboard/interviews" icon={<CalendarClock size={20} />}>Interviews</NavItem>
                        <NavItem href="/dashboard/collaboration" icon={<MessageSquare size={20} />}>Collaboration</NavItem>
                        <NavItem href="/dashboard/communications" icon={<Mail size={20} />}>Comms</NavItem>
                        <NavItem href="/dashboard/sourcing" icon={<Radar size={20} />}>Sourcing</NavItem>
                        <NavItem href="/dashboard/automations" icon={<Bot size={20} />}>Automations</NavItem>
                        <NavItem href="/dashboard/analytics" icon={<TrendingUp size={20} />}>Analytics</NavItem>
                        <NavItem href="/dashboard/settings" icon={<Settings size={20} />}>Settings</NavItem>
                    </div>

                    <div className="border-t border-border pt-4">
                        <Link href="/" className="flex items-center gap-3 rounded-full px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10">
                            <LogOut size={20} />
                            Sign Out
                        </Link>
                    </div>
                </nav>
            </aside>

            <div className="flex min-h-screen flex-1 flex-col md:ml-64">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/85 px-8 backdrop-blur-xl">
                    <div className="flex items-center gap-4 rounded-full border border-border bg-card px-4 py-2 text-ink-3 shadow-card">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search candidates, jobs, actions..."
                            className="w-64 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/notifications" className="relative rounded-full border border-border bg-card p-2 text-ink-2 transition-colors hover:bg-surface-muted">
                            <Bell size={20} />
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
                        </Link>
                        <Link href="/dashboard/profile" className="block">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-bold text-surface transition-transform hover:-translate-y-0.5">
                                DR
                            </div>
                        </Link>
                    </div>
                </header>

                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href || pathname?.startsWith(href + "/");

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-accent text-ink" : "text-ink-2 hover:bg-surface-muted hover:text-ink"
                }`}
        >
            {icon}
            {children}
        </Link>
    );
}
