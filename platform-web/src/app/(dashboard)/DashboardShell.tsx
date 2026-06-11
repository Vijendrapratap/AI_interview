"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Users, Briefcase, Settings, Search, TrendingUp,
    LogOut, Kanban, CalendarClock, Mail, UserCog, ShieldCheck
} from "lucide-react";
import { ToastProvider } from "@/components";
import { createClient } from "@/lib/supabase/client";

export default function DashboardShell({ children, platformAdmin = false }: { children: React.ReactNode; platformAdmin?: boolean }) {
    const [userInitials, setUserInitials] = useState("??");
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            const email = user.email ?? "";
            const fullName: string = user.user_metadata?.full_name ?? "";
            if (fullName) {
                const parts = fullName.trim().split(/\s+/);
                const initials = parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : parts[0].slice(0, 2).toUpperCase();
                setUserInitials(initials);
            } else if (email) {
                setUserInitials(email.slice(0, 2).toUpperCase());
            }
        });
    }, []);

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
                            {/* Pilot nav: stub pages (hiring-flow, collaboration, sourcing,
                                automations) are hidden until they have real data behind them. */}
                            <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />}>Dashboard</NavItem>
                            <NavItem href="/dashboard/jobs" icon={<Briefcase size={18} />}>Jobs</NavItem>
                            <NavItem href="/dashboard/pipeline" icon={<Kanban size={18} />}>Pipeline</NavItem>
                            <NavItem href="/dashboard/candidates" icon={<Users size={18} />}>Candidates</NavItem>
                            <NavItem href="/dashboard/interviews" icon={<CalendarClock size={18} />}>Interviews</NavItem>
                            <NavItem href="/dashboard/communications" icon={<Mail size={18} />}>Comms</NavItem>
                            <NavItem href="/dashboard/analytics" icon={<TrendingUp size={18} />}>Analytics</NavItem>
                            <NavItem href="/dashboard/team" icon={<UserCog size={18} />}>Team</NavItem>
                            <NavItem href="/dashboard/settings" icon={<Settings size={18} />}>Settings</NavItem>
                            {platformAdmin && (
                                <NavItem href="/admin" icon={<ShieldCheck size={18} />}>Platform</NavItem>
                            )}
                        </div>

                        <div className="border-t border-border pt-4">
                            <button
                                type="button"
                                onClick={async () => {
                                    const supabase = createClient();
                                    await supabase.auth.signOut();
                                    router.push("/login");
                                    router.refresh();
                                }}
                                className="flex w-full items-center gap-3 rounded-pill px-3 py-2 text-[13px] font-bold text-danger transition-colors hover:bg-danger-soft"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
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
                            <Link href="/dashboard/profile" className="block">
                                <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-accent text-[13px] font-bold text-accent-ink transition-transform hover:-translate-y-0.5">
                                    {userInitials}
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
