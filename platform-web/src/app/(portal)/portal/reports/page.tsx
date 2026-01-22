"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ReportsPage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to resume analysis by default
        router.replace("/portal/reports/resume")
    }, [router])

    return (
        <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-gray-500">Loading reports...</div>
        </div>
    )
}
