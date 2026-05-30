"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Surfaces the real error in logs instead of only the opaque prod digest.
        console.error("[dashboard] unhandled error", error)
    }, [error])

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
            <Card className="w-full max-w-md p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-danger-soft text-danger">
                    <AlertTriangle size={22} />
                </div>
                <h1 className="font-serif text-2xl text-ink mb-1 tracking-tight">Something went wrong</h1>
                <p className="text-ink-2 mb-6 text-sm">
                    This view hit an error. Your data is safe — try again, and if it keeps happening let us know.
                    {error.digest && (
                        <span className="mt-2 block text-ink-3">Reference: {error.digest}</span>
                    )}
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Button variant="primary" onClick={() => reset()}>
                        <RotateCcw size={16} className="mr-2" />
                        Try again
                    </Button>
                    <a href="/dashboard" className="text-sm text-ink underline underline-offset-2">
                        Back to dashboard
                    </a>
                </div>
            </Card>
        </div>
    )
}
