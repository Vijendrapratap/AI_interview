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
    LogOut
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 hidden md:block">
                <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100 cursor-pointer">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            AI
                        </div>
                        <span className="text-lg font-bold text-gray-900">Recruiter.ai</span>
                    </Link>
                </div>

                <nav className="p-4 space-y-1 flex flex-col h-[calc(100%-4rem)] justify-between">
                    <div className="space-y-1">
                        <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />}>Dashboard</NavItem>
                        <NavItem href="/dashboard/jobs" icon={<Briefcase size={20} />}>Jobs</NavItem>
                        <NavItem href="/dashboard/candidates" icon={<Users size={20} />}>Candidates</NavItem>
                        <NavItem href="/dashboard/analytics" icon={<TrendingUp size={20} />}>Analytics</NavItem>
                        <NavItem href="/dashboard/settings" icon={<Settings size={20} />}>Settings</NavItem>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut size={20} />
                            Sign Out
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-4 text-gray-500">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search candidates, jobs..."
                            className="bg-transparent outline-none w-64 text-sm text-gray-900"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/notifications" className="text-gray-500 hover:bg-gray-100 p-2 rounded-full relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                        </Link>
                        <Link href="/dashboard/profile" className="block">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-medium text-gray-700 hover:ring-2 hover:ring-blue-100 transition-all">
                                DR
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
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
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
        >
            {icon}
            {children}
        </Link>
    );
}
