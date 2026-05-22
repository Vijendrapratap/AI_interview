"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { PageHeader, Button } from "@/components"
import { Label, Input, Textarea, Select } from "@/components"

export default function NewJobPage() {
    const [formData, setFormData] = useState({
        title: "",
        department: "",
        location: "",
        type: "Full-time",
        salary_range: "",
        description: "",
        requirements: ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        alert("This is a demo. In a real app, this would post to the API.")
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
                            <Label required>Department</Label>
                            <Select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Select department…</option>
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
                        <div>
                            <Label>Salary Range</Label>
                            <Input
                                type="text"
                                name="salary_range"
                                value={formData.salary_range}
                                onChange={handleChange}
                                placeholder="e.g. $120k - $150k"
                            />
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

                </div>

                <div className="flex justify-end gap-3">
                    <Link
                        href="/dashboard/jobs"
                        className="inline-flex items-center justify-center h-10 px-5 rounded-pill border border-border bg-card text-[13px] font-bold text-ink hover:bg-surface-muted"
                    >
                        Cancel
                    </Link>
                    <Button type="submit" variant="primary">
                        <Save size={16} /> Publish Job
                    </Button>
                </div>
            </form>
        </div>
    )
}
