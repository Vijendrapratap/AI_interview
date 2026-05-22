"use client"

import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Button } from "@/components"

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = useAppStore((state) => state.user)
    const logout = useAppStore((state) => state.logout)
    const router = useRouter()

    const handleLogout = () => {
        logout()
        router.push("/login")
    }

    return (
        <div className="min-h-screen font-sans">
            <header className="bg-card border-b border-border sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-tile flex items-center justify-center text-accent-ink font-bold text-sm">
                            AI
                        </div>
                        <span className="font-bold text-xl text-ink">Candidate Portal</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-ink-3 hidden sm:block">
                            Welcome, <span className="font-medium text-ink">{user?.name || "Candidate"}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            Log out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    )
}
