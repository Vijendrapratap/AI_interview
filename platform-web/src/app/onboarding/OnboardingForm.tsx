"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ensureOrganization } from "@/lib/data/organizations"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { Input } from "@/components/Field"

export default function OnboardingForm({ defaultName }: { defaultName: string }) {
    const router = useRouter()
    const [orgName, setOrgName] = useState(defaultName)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError("")
        try {
            const orgId = await ensureOrganization(orgName)
            if (!orgId) {
                router.push("/login")
                return
            }
            router.push("/dashboard")
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create your workspace")
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-10">
                <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">Name your workspace</h1>
                <p className="text-ink-2 mb-8">One last step to set up your organization on ReCruItAI.</p>

                {error && (
                    <div role="alert" aria-live="polite" className="mb-4 text-danger text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="org-name" className="mb-1.5 block text-[12px] font-bold text-ink-2">
                            Organization name
                        </label>
                        <Input
                            id="org-name"
                            type="text"
                            required
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="Acme Corp"
                        />
                    </div>

                    <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 aria-hidden="true" className="animate-spin w-4 h-4 mr-2" />
                                Setting up…
                            </>
                        ) : (
                            "Enter dashboard"
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    )
}
