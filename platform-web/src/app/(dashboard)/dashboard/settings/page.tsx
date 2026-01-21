
import { Save, User, Building, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-500 mb-8">Manage your organization preferences.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar Navigation (Mock) */}
                <div className="space-y-1">
                    <button className="w-full text-left px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg flex items-center gap-2">
                        <Building size={18} /> Organization
                    </button>
                    <button className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors">
                        <User size={18} /> Team Members
                    </button>
                    <button className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors">
                        <SettingsIcon size={18} /> Integrations
                    </button>
                </div>

                {/* Main Settings Form */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Organization Profile</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input type="text" defaultValue="Acme Corp" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option>Technology</option>
                                        <option>Finance</option>
                                        <option>Healthcare</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option>1-50 employees</option>
                                        <option>51-200 employees</option>
                                        <option>200+ employees</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                <input type="url" defaultValue="https://acmecorp.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
