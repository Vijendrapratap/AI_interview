"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, Check } from "lucide-react"
import { PageHeader, Button } from "@/components"
import { Label, Input, Textarea, Select } from "@/components"
import { createJob } from "@/lib/data/jobs"
import { listConnections, publishJob, type Connection } from "@/lib/data/connections"

export default function NewJobPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        title: "",
        department: "",
        location: "",
        type: "Full-time",
        salary_min: "",
        salary_max: "",
        description: "",
        requirements: ""
    })
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    
    // Platform Connections
    const [connections, setConnections] = useState<Connection[]>([])
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null)

    useEffect(() => {
        listConnections().then(conns => {
            setConnections(conns);
            // Pre-select all standard connections
            setSelectedPlatforms(conns.map(c => c.platform));
        });
    }, []);

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev => 
            prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!formData.title.trim()) {
            setError("Job title is required.")
            return
        }

        const requirements = formData.requirements
            .split(",")
            .map(r => r.trim())
            .filter(r => r.length > 0)

        const salary_min = formData.salary_min ? Number(formData.salary_min) : null
        const salary_max = formData.salary_max ? Number(formData.salary_max) : null

        if (formData.salary_min && isNaN(Number(formData.salary_min))) {
            setError("Salary min must be a number.")
            return
        }
        if (formData.salary_max && isNaN(Number(formData.salary_max))) {
            setError("Salary max must be a number.")
            return
        }

        setSubmitting(true)
        try {
            const newId = await createJob({
                title: formData.title.trim(),
                department: formData.department.trim() || null,
                location: formData.location.trim() || null,
                employment_type: formData.type,
                salary_min,
                salary_max,
                description: formData.description.trim(),
                requirements,
                status: "open"
            })

            // Trigger visual connection syndication if platforms are selected
            if (selectedPlatforms.length > 0) {
                for (const platform of selectedPlatforms) {
                    setPublishingPlatform(platform);
                    await new Promise(r => setTimeout(r, 700));
                }
                await publishJob(newId, selectedPlatforms);
            }

            router.push(`/dashboard/jobs/${newId}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
            setSubmitting(false)
            setPublishingPlatform(null)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <Link href="/dashboard/jobs" className="inline-flex items-center gap-1.5 text-meta hover:text-ink transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Jobs
            </Link>

            <PageHeader
                eyebrow="Jobs"
                title="Create New Job"
                subtitle="Post a new opening to start collecting applications."
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-card border border-border-card rounded-card shadow-card p-8 space-y-6">

                    {error && (
                        <div className="rounded-field border border-danger bg-danger-soft px-4 py-3 text-[13px] text-danger-soft-ink">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label required>Job Title</Label>
                            <Input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Senior Frontend Engineer"
                                required
                            />
                        </div>
                        <div>
                            <Label>Department</Label>
                            <Select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                            >
                                <option value="">Select department…</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Design">Design</option>
                                <option value="Product">Product</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Sales">Sales</option>
                                <option value="Operations">Operations</option>
                                <option value="People">People</option>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label>Location</Label>
                            <Input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Remote"
                            />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                            >
                                <option>Full-time</option>
                                <option>Part-time</option>
                                <option>Contract</option>
                                <option>Internship</option>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Salary Min</Label>
                                <Input
                                    type="number"
                                    name="salary_min"
                                    value={formData.salary_min}
                                    onChange={handleChange}
                                    placeholder="e.g. 120000"
                                />
                            </div>
                            <div>
                                <Label>Salary Max</Label>
                                <Input
                                    type="number"
                                    name="salary_max"
                                    value={formData.salary_max}
                                    onChange={handleChange}
                                    placeholder="e.g. 150000"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label>Description</Label>
                        <Textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Describe the role and responsibilities..."
                        />
                    </div>

                    <div>
                        <Label>Key Requirements (Comma separated)</Label>
                        <Textarea
                            name="requirements"
                            value={formData.requirements}
                            onChange={handleChange}
                            rows={2}
                            placeholder="e.g. React, TypeScript, Node.js, 5+ years experience"
                        />
                    </div>

                    {/* Multi-platform connections publishing */}
                    <div className="border-t border-border-card pt-6 space-y-4">
                        <div>
                            <h3 className="text-[14px] font-bold text-ink">ATS Multi-Platform Posting</h3>
                            <p className="text-meta mt-0.5 text-ink-3">Automatically syndicates this job post to your active connections upon creation.</p>
                        </div>
                        {connections.length === 0 ? (
                            <div className="rounded-tile border border-dashed border-border p-4 text-center">
                                <p className="text-meta text-ink-3">No active connections configured. You can publish jobs locally, or set up connections under <Link href="/dashboard/settings" className="text-accent font-semibold hover:underline">Settings &rarr;</Link></p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {connections.map(c => {
                                    const isChecked = selectedPlatforms.includes(c.platform);
                                    return (
                                        <button
                                            type="button"
                                            key={c.id}
                                            onClick={() => togglePlatform(c.platform)}
                                            className={`flex items-center justify-between rounded-field border p-3.5 text-left transition-all ${
                                                isChecked 
                                                    ? "border-accent bg-accent-soft text-accent-soft-ink font-semibold" 
                                                    : "border-border bg-card text-ink-2 hover:bg-surface"
                                            }`}
                                        >
                                            <span className="text-xs">{c.platform}</span>
                                            {isChecked && <Check size={16} className="text-accent shrink-0 ml-2" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>

                <div className="flex justify-end gap-3">
                    <Link
                        href="/dashboard/jobs"
                        className="inline-flex items-center justify-center h-10 px-5 rounded-pill border border-border bg-card text-[13px] font-bold text-ink hover:bg-surface-muted"
                    >
                        Cancel
                    </Link>
                    <Button type="submit" variant="primary" disabled={submitting}>
                        {publishingPlatform ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" /> Syndicating to {publishingPlatform}…
                            </>
                        ) : submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" /> Publishing…
                            </>
                        ) : (
                            <>
                                <Save size={16} className="mr-2" /> Publish Job
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
