import { useState, useEffect } from 'react';
import { TrendingUp, Users, ShoppingBag, PieChart, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react';
import api from '../lib/api';

interface CategoryData {
    category: string;
    count: number;
    total: number;
    percentage?: string;
}

interface ItemData {
    name: string;
    count: number;
    totalSpent: number;
}

interface GlobalInsights {
    totalExpenses: number;
    grandTotal: number;
    avgSpendPerUser: string;
    topCategories: CategoryData[];
    topItems: ItemData[];
    userSegments: {
        high: number;
        medium: number;
        budget: number;
    };
}

interface UserInsights {
    userId: string;
    totalExpenses: number;
    totalSpent: number;
    avgMonthlySpend: string;
    spendingTier: 'high' | 'medium' | 'budget';
    topCategories: CategoryData[];
    topItems: ItemData[];
    peakDays: string[];
    lastActive: string;
}

export default function UserInsightsPage() {
    const [globalInsights, setGlobalInsights] = useState<GlobalInsights | null>(null);
    const [userInsights, setUserInsights] = useState<UserInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'global' | 'user'>('global');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchGlobalInsights();
        fetchUsers();
    }, []);

    const fetchGlobalInsights = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/insights/global');
            setGlobalInsights(res.data);
        } catch (error) {
            console.error('Error fetching global insights:', error);
        }
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users?limit=100');
            setUsers(res.data.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchUserInsights = async (userId: string) => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/insights/user/${userId}`);
            setUserInsights(res.data);
        } catch (error) {
            console.error('Error fetching user insights:', error);
        }
        setLoading(false);
    };

    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        setShowUserDropdown(false);
        fetchUserInsights(userId);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'high': return 'bg-green-100 text-green-700';
            case 'medium': return 'bg-yellow-100 text-yellow-700';
            case 'budget': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getCategoryColor = (index: number) => {
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
        return colors[index % colors.length];
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !globalInsights) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">User Insights</h1>
                <p className="text-gray-500">Spending patterns and ad targeting data</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('global')}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'global'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Global Insights
                </button>
                <button
                    onClick={() => setActiveTab('user')}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    User Insights
                </button>
            </div>

            {/* Global Insights */}
            {activeTab === 'global' && globalInsights && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Expenses</p>
                                    <p className="text-xl font-bold">{globalInsights.totalExpenses}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <ShoppingBag className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Grand Total</p>
                                    <p className="text-xl font-bold">{formatCurrency(globalInsights.grandTotal)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Avg per User</p>
                                    <p className="text-xl font-bold">{formatCurrency(parseFloat(globalInsights.avgSpendPerUser))}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <PieChart className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Top Items</p>
                                    <p className="text-xl font-bold">{globalInsights.topItems.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Segments */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">User Segments (for Ad Targeting)</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-3xl font-bold text-green-600">{globalInsights.userSegments.high}</p>
                                <p className="text-sm text-gray-600">High Spenders ($500+)</p>
                                <p className="text-xs text-gray-400 mt-1">Premium product ads</p>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                <p className="text-3xl font-bold text-yellow-600">{globalInsights.userSegments.medium}</p>
                                <p className="text-sm text-gray-600">Medium ($100-$500)</p>
                                <p className="text-xs text-gray-400 mt-1">Mid-range offers</p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-3xl font-bold text-gray-600">{globalInsights.userSegments.budget}</p>
                                <p className="text-sm text-gray-600">Budget (&lt;$100)</p>
                                <p className="text-xs text-gray-400 mt-1">Deal & discount ads</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Categories */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
                            <div className="space-y-3">
                                {globalInsights.topCategories.slice(0, 8).map((cat, idx) => (
                                    <div key={cat.category} className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(idx)}`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="font-medium capitalize">{cat.category}</span>
                                                <span className="text-gray-500">{cat.percentage}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div
                                                    className={`h-2 rounded-full ${getCategoryColor(idx)}`}
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Items */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">Top Purchase Items</h3>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {globalInsights.topItems.slice(0, 15).map((item, idx) => (
                                    <div key={item.name} className="flex justify-between items-center py-2 border-b last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 text-sm w-6">{idx + 1}.</span>
                                            <span className="font-medium capitalize">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm text-gray-600">{item.count}x</span>
                                            <span className="text-sm text-gray-400 ml-2">{formatCurrency(item.totalSpent)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Insights */}
            {activeTab === 'user' && (
                <div className="space-y-6">
                    {/* User Selector */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
                        <div className="relative">
                            <button
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="w-full flex items-center justify-between px-4 py-2 border rounded-lg bg-white"
                            >
                                <span>
                                    {selectedUserId
                                        ? users.find(u => u.id === selectedUserId)?.name || 'Unknown'
                                        : 'Choose a user...'
                                    }
                                </span>
                                {showUserDropdown ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {showUserDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                    <div className="p-2 border-b">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search users..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    {filteredUsers.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleUserSelect(user.id)}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100"
                                        >
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Insights Display */}
                    {loading && selectedUserId && (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                    )}

                    {!loading && userInsights && (
                        <>
                            {/* User Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-white rounded-lg shadow p-4 text-center">
                                    <p className="text-3xl font-bold">{userInsights.totalExpenses}</p>
                                    <p className="text-sm text-gray-500">Total Expenses</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4 text-center">
                                    <p className="text-3xl font-bold">{formatCurrency(userInsights.totalSpent)}</p>
                                    <p className="text-sm text-gray-500">Total Spent</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4 text-center">
                                    <p className="text-3xl font-bold">{formatCurrency(parseFloat(userInsights.avgMonthlySpend))}</p>
                                    <p className="text-sm text-gray-500">Avg Monthly</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTierColor(userInsights.spendingTier)}`}>
                                        {userInsights.spendingTier.toUpperCase()}
                                    </span>
                                    <p className="text-sm text-gray-500 mt-1">Spending Tier</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4 text-center">
                                    <p className="text-lg font-bold">{userInsights.peakDays.join(', ') || 'N/A'}</p>
                                    <p className="text-sm text-gray-500">Peak Days</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* User Top Categories */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">User's Top Categories</h3>
                                    <div className="space-y-3">
                                        {userInsights.topCategories.map((cat) => (
                                            <div key={cat.category} className="flex items-center justify-between py-2 border-b last:border-0">
                                                <span className="font-medium capitalize">{cat.category}</span>
                                                <div className="text-right">
                                                    <span className="text-sm text-gray-600">{cat.count} expenses</span>
                                                    <span className="text-sm text-gray-400 ml-2">{formatCurrency(cat.total)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* User Top Items */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">User's Frequently Bought Items</h3>
                                    {userInsights.topItems.length > 0 ? (
                                        <div className="space-y-2">
                                            {userInsights.topItems.map((item) => (
                                                <div key={item.name} className="flex justify-between items-center py-2 border-b last:border-0">
                                                    <span className="font-medium capitalize">{item.name}</span>
                                                    <span className="text-sm text-gray-600">{item.count}x bought</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No purchase items found</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {!selectedUserId && (
                        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                            Select a user to view their spending insights
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
