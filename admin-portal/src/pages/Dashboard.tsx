import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Users, User, CreditCard, DollarSign, UserCheck, UserX } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/admin/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatsCard title="Total Users" value={stats?.users || 0} icon={User} color="bg-blue-500" />
                <StatsCard title="Active Users (7d)" value={stats?.activeUsers || 0} icon={UserCheck} color="bg-green-500" />
                <StatsCard title="Suspended" value={stats?.suspendedUsers || 0} icon={UserX} color="bg-yellow-500" />
                <StatsCard title="Total Groups" value={stats?.groups || 0} icon={Users} color="bg-purple-500" />
                <StatsCard title="Total Expenses" value={stats?.expenses || 0} icon={CreditCard} color="bg-indigo-500" />
                <StatsCard title="Total Volume" value={`$${stats?.totalTransactionVolume?.toFixed(2) || 0}`} icon={DollarSign} color="bg-emerald-500" />
            </div>

            {/* Quick Links */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <a href="/users" className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                        <User className="h-6 w-6 text-blue-500 mb-2" />
                        <div className="font-medium">Manage Users</div>
                        <div className="text-sm text-gray-500">View, suspend, promote users</div>
                    </a>
                    <a href="/groups" className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                        <Users className="h-6 w-6 text-purple-500 mb-2" />
                        <div className="font-medium">Manage Groups</div>
                        <div className="text-sm text-gray-500">View and delete groups</div>
                    </a>
                    <a href="/expenses" className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                        <CreditCard className="h-6 w-6 text-indigo-500 mb-2" />
                        <div className="font-medium">Manage Expenses</div>
                        <div className="text-sm text-gray-500">View and moderate expenses</div>
                    </a>
                    <a href="/settings" className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                        <DollarSign className="h-6 w-6 text-emerald-500 mb-2" />
                        <div className="font-medium">Settings</div>
                        <div className="text-sm text-gray-500">Configure system settings</div>
                    </a>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color }: any) {
    return (
        <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-md ${color} text-white`}>
                            <Icon className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="truncate text-sm font-medium text-gray-500">{title}</dt>
                            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}

