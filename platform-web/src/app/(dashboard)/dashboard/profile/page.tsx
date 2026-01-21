
import { User, Mail, Shield, Key, LogOut } from "lucide-react";

export default function ProfilePage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <div className="px-8 pb-8 relative">
                    <div className="w-24 h-24 bg-white rounded-full p-1 absolute -top-12 shadow-lg">
                        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                            DR
                        </div>
                    </div>

                    <div className="mt-16 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">David Recruiter</h2>
                            <p className="text-gray-500">Senior Talent Acquisition Manager</p>
                            <div className="flex gap-4 mt-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Mail size={16} /> david.r@example.com
                                </div>
                                <div className="flex items-center gap-1">
                                    <Shield size={16} /> Admin Access
                                </div>
                            </div>
                        </div>
                        <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <User size={18} /> Personal Information
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                            <input type="text" value="David Recruiter" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm" readOnly />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
                            <input type="text" value="Admin" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm" readOnly />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Key size={18} /> Security
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                                <div className="font-medium text-gray-900 text-sm">Password</div>
                                <div className="text-xs text-gray-500">Last changed 3 months ago</div>
                            </div>
                            <button className="text-blue-600 text-sm font-semibold">Change</button>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <div>
                                <div className="font-medium text-gray-900 text-sm">Two-Factor Authentication</div>
                                <div className="text-xs text-green-600">Enabled</div>
                            </div>
                            <button className="text-gray-400 text-sm font-semibold">Configure</button>
                        </div>
                        <button className="w-full mt-4 flex items-center justify-center gap-2 text-red-600 bg-red-50 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors">
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
