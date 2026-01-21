"use client"

import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"

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
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            AI
                        </div>
                        <span className="font-bold text-xl text-gray-900">Candidate Portal</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 hidden sm:block">
                            Welcome, <span className="font-medium text-gray-900">{user?.name || "Candidate"}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    )
}
