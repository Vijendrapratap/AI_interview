"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { provisionOrganization } from "@/lib/data/organizations"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { Input } from "@/components/Field"

export default function SignupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [orgName, setOrgName] = useState("")
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        const supabase = createClient()
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        })
        if (signUpError) {
            setError(signUpError.message)
            setIsLoading(false)
            return
        }
        try {
            await provisionOrganization(orgName)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create organization")
            setIsLoading(false)
            return
        }
        router.push("/dashboard")
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-10">
                <h1 className="font-serif text-3xl text-ink mb-1 tracking-tight">Create your workspace</h1>
                <p className="text-ink-2 mb-8">Set up your organization on ReCruItAI</p>

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

                    <div>
                        <label htmlFor="full-name" className="mb-1.5 block text-[12px] font-bold text-ink-2">
                            Your full name
                        </label>
                        <Input
                            id="full-name"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Smith"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-1.5 block text-[12px] font-bold text-ink-2">
                            Email address
                        </label>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-1.5 block text-[12px] font-bold text-ink-2">
                            Password
                        </label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
                            >
                                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>

                    <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 aria-hidden="true" className="animate-spin w-4 h-4 mr-2" />
                                Creating workspace…
                            </>
                        ) : (
                            "Create organization"
                        )}
                    </Button>
                </form>

                <p className="text-sm text-ink-2 mt-6 text-center">
                    Already have an account?{" "}
                    <Link href="/login" className="text-ink underline underline-offset-2">
                        Sign in
                    </Link>
                </p>
            </Card>
        </div>
    )
}
