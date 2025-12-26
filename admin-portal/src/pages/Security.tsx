import { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, UserCheck, Clock, Activity, RefreshCw } from 'lucide-react';
import api from '../lib/api';

interface LoginData {
    id: string;
    name: string;
    email: string;
    role: string;
    lastLoginAt: string;
}

interface SecurityOverview {
    totalUsers: number;
    adminCount: number;
    suspendedCount: number;
    bannedCount: number;
    activeToday: number;
    activeWeek: number;
    inactiveUsers: number;
}

export default function Security() {
    const [recentLogins, setRecentLogins] = useState<LoginData[]>([]);
    const [overview, setOverview] = useState<SecurityOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [loginsRes, overviewRes] = await Promise.all([
                    api.get('/admin/security/logins?limit=50'),
                    api.get('/admin/security/overview')
                ]);
                setRecentLogins(loginsRes.data);
                setOverview(overviewRes.data);
            } catch (error) {
                console.error('Error fetching security data:', error);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Security Monitoring</h1>
                <p className="text-gray-500">User activity and security overview</p>
            </div>

            {/* Security Overview Cards */}
            {overview && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <Users className="w-8 h-8 text-blue-500 mb-2" />
                            <p className="text-2xl font-bold">{overview.totalUsers}</p>
                            <p className="text-xs text-gray-500">Total Users</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <Shield className="w-8 h-8 text-purple-500 mb-2" />
                            <p className="text-2xl font-bold">{overview.adminCount}</p>
                            <p className="text-xs text-gray-500">Admins</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                            <p className="text-2xl font-bold">{overview.suspendedCount}</p>
                            <p className="text-xs text-gray-500">Suspended</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                            <p className="text-2xl font-bold">{overview.bannedCount}</p>
                            <p className="text-xs text-gray-500">Banned</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <Activity className="w-8 h-8 text-green-500 mb-2" />
                            <p className="text-2xl font-bold">{overview.activeToday}</p>
                            <p className="text-xs text-gray-500">Active Today</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <UserCheck className="w-8 h-8 text-teal-500 mb-2" />
                            <p className="text-2xl font-bold">{overview.activeWeek}</p>
                            <p className="text-xs text-gray-500">Active (7d)</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <Clock className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-2xl font-bold">{overview.inactiveUsers}</p>
                            <p className="text-xs text-gray-500">Inactive</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Logins */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Recent Login Activity</h2>
                </div>
                <div className="divide-y">
                    {recentLogins.length === 0 ? (
                        <div className="px-6 py-8 text-center text-gray-500">
                            No login activity recorded yet
                        </div>
                    ) : (
                        recentLogins.map((login) => (
                            <div key={login.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${login.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                                        }`}>
                                        {login.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{login.name}</p>
                                        <p className="text-sm text-gray-500">{login.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {login.role === 'admin' && (
                                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                            Admin
                                        </span>
                                    )}
                                    <span className="text-sm text-gray-500">
                                        {formatDate(login.lastLoginAt)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
