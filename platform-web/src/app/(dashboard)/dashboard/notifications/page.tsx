"use client";

import { UserPlus, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { PageHeader, Card, Banner, Button } from "@/components";

const NOTIFICATIONS = [
    {
        id: 1,
        type: "candidate_match",
        title: "New 95% Match Found",
        message: "Alice Wang matches the Lead Data Scientist role.",
        time: "2 hours ago",
        read: false,
        icon: <UserPlus size={18} className="text-accent-soft-ink" />,
        iconBg: "bg-accent-soft",
    },
    {
        id: 2,
        type: "interview_complete",
        title: "Interview Completed",
        message: "Arjun Singh completed the Senior Backend Engineer interview.",
        time: "4 hours ago",
        read: false,
        icon: <CheckCircle size={18} className="text-success-soft-ink" />,
        iconBg: "bg-success-soft",
    },
    {
        id: 3,
        type: "system",
        title: "System Update",
        message: "The platform will undergo maintenance at 2 AM UTC.",
        time: "1 day ago",
        read: true,
        icon: <AlertTriangle size={18} className="text-warning-soft-ink" />,
        iconBg: "bg-warning-soft",
    },
    {
        id: 4,
        type: "resume",
        title: "Resume Analysis Failed",
        message: "Could not parse mock_resume_failed.pdf. File corrupted.",
        time: "2 days ago",
        read: true,
        icon: <FileText size={18} className="text-danger-soft-ink" />,
        iconBg: "bg-danger-soft",
    },
];

export default function NotificationsPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Banner tone="neutral">
                This area is read-only for now — full functionality lands in Slice 2.
            </Banner>

            <PageHeader
                eyebrow="Inbox"
                title="Notifications"
                subtitle="Stay updated with your hiring pipeline."
                actions={
                    <Button variant="ghost" size="sm">
                        Mark all as read
                    </Button>
                }
            />

            <div className="space-y-3">
                {NOTIFICATIONS.map((notif) => (
                    <Card
                        key={notif.id}
                        variant="compact"
                        className={`flex gap-4 ${!notif.read ? "border-border" : ""}`}
                    >
                        <div
                            className={`w-9 h-9 rounded-pill flex items-center justify-center shrink-0 ${notif.iconBg}`}
                        >
                            {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                                <h3 className={`text-[13px] font-semibold ${notif.read ? "text-ink-2" : "text-ink"}`}>
                                    {notif.title}
                                </h3>
                                <span className="text-meta shrink-0">{notif.time}</span>
                            </div>
                            <p className="text-meta mt-0.5">{notif.message}</p>
                        </div>
                        {!notif.read && (
                            <div className="w-2 h-2 bg-accent rounded-pill mt-1.5 shrink-0" />
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
