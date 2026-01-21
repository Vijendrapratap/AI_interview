import { UserPlus, FileText, AlertTriangle, CheckCircle } from "lucide-react";

const NOTIFICATIONS = [
    {
        id: 1,
        type: "candidate_match",
        title: "New 95% Match Found",
        message: "Alice Wang matches the Lead Data Scientist role.",
        time: "2 hours ago",
        read: false,
        icon: <UserPlus size={18} className="text-blue-600" />,
        bg: "bg-blue-50"
    },
    {
        id: 2,
        type: "interview_complete",
        title: "Interview Completed",
        message: "Arjun Singh completed the Senior Backend Engineer interview.",
        time: "4 hours ago",
        read: false,
        icon: <CheckCircle size={18} className="text-green-600" />,
        bg: "bg-green-50"
    },
    {
        id: 3,
        type: "system",
        title: "System Update",
        message: "The platform will undergo maintenance at 2 AM UTC.",
        time: "1 day ago",
        read: true,
        icon: <AlertTriangle size={18} className="text-yellow-600" />,
        bg: "bg-yellow-50"
    },
    {
        id: 4,
        type: "resume",
        title: "Resume Analysis Failed",
        message: "Could not parse mock_resume_failed.pdf. File corrupted.",
        time: "2 days ago",
        read: true,
        icon: <FileText size={18} className="text-red-600" />,
        bg: "bg-red-50"
    }
];

export default function NotificationsPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Notifications</h1>
                    <p className="text-gray-500">Stay updated with your hiring pipeline.</p>
                </div>
                <button className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                    Mark all as read
                </button>
            </div>

            <div className="space-y-4">
                {NOTIFICATIONS.map((notif) => (
                    <div
                        key={notif.id}
                        className={`p-4 rounded-xl border flex gap-4 transition-colors ${notif.read ? 'bg-white border-gray-100' : 'bg-blue-50/30 border-blue-100'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.bg}`}>
                            {notif.icon}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className={`text-sm font-semibold ${notif.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                    {notif.title}
                                </h3>
                                <span className="text-xs text-gray-400">{notif.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                {notif.message}
                            </p>
                        </div>
                        {!notif.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
