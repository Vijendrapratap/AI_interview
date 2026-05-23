"use client";

import { Mail, Shield, Key, LogOut } from "lucide-react";
import {
    PageHeader,
    Card,
    SectionCard,
    Avatar,
    Button,
    Label,
    Input,
    PreviewBanner,
} from "@/components";

export default function ProfilePage() {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <PreviewBanner />
            <PageHeader
                eyebrow="Account"
                title="My Profile"
                subtitle="Manage your personal information and security settings."
            />

            {/* Profile header card — clean flex row, no overlap */}
            <Card>
                <div className="flex items-center gap-5">
                    <Avatar size="lg" initials="DR" />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-page-title">David Recruiter</h2>
                        <p className="text-meta mt-0.5">Senior Talent Acquisition Manager</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-[13px] text-ink-2">
                            <span className="flex items-center gap-1.5">
                                <Mail size={14} /> david.r@example.com
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Shield size={14} /> Admin Access
                            </span>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm">
                        Edit Profile
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <SectionCard title="Personal Information">
                    <div className="space-y-4">
                        <div>
                            <Label>Full Name</Label>
                            <Input type="text" value="David Recruiter" readOnly />
                        </div>
                        <div>
                            <Label>Email Address</Label>
                            <Input type="email" value="david.r@example.com" readOnly />
                        </div>
                        <div>
                            <Label>Role</Label>
                            <Input type="text" value="Admin" readOnly />
                        </div>
                        <div>
                            <Label>Department</Label>
                            <Input type="text" value="Talent Acquisition" readOnly />
                        </div>
                    </div>
                </SectionCard>

                {/* Security */}
                <SectionCard title="Security">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-border-card">
                            <div>
                                <p className="text-[13px] font-semibold text-ink">Password</p>
                                <p className="text-meta">Last changed 3 months ago</p>
                            </div>
                            <Button variant="ghost" size="sm">
                                <Key size={14} /> Change
                            </Button>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <div>
                                <p className="text-[13px] font-semibold text-ink">Two-Factor Authentication</p>
                                <p className="text-[12px] font-medium text-success">Enabled</p>
                            </div>
                            <Button variant="ghost" size="sm">Configure</Button>
                        </div>
                        <div className="pt-2">
                            <Button variant="danger" className="w-full">
                                <LogOut size={14} /> Sign Out
                            </Button>
                        </div>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
