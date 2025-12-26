import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Trash2, Search, ChevronLeft, ChevronRight, Shield, ShieldOff, UserCheck, Key, Eye, MapPin, Users, Globe, Building2 } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'suspended' | 'banned';
    customId: string;
    createdAt: string;
    lastLoginAt?: string;
    city?: string;
    country?: string;
    state?: string;
    zipCode?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface LocationStats {
    totalUsers: number;
    usersWithLocation: number;
    usersWithoutLocation: number;
    locationCoverage: string;
    topCountries: { country: string; count: number }[];
    topCities: { city: string; country: string; count: number }[];
}

interface GroupData {
    id: string;
    name: string;
    memberCount: number;
    members: { id: string; name: string; email: string; location: string | null }[];
}

type ViewMode = 'all' | 'by-location' | 'by-group';

export default function UsersPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Location view state
    const [locationStats, setLocationStats] = useState<LocationStats | null>(null);
    const [locationData, setLocationData] = useState<any>(null);

    // Group view state
    const [groupData, setGroupData] = useState<{ groups: GroupData[]; usersWithoutGroup: any[]; summary: any } | null>(null);

    // Location filter state (for All Users)
    const [filterCountry, setFilterCountry] = useState('');
    const [filterState, setFilterState] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [locationHierarchy, setLocationHierarchy] = useState<{
        allCountries: string[];
        allStates: string[];
        allCities: string[];
        hierarchy: any[];
    } | null>(null);

    const fetchLocationHierarchy = async () => {
        try {
            const response = await api.get('/admin/location/hierarchy');
            setLocationHierarchy(response.data);
        } catch (error) {
            console.error('Failed to fetch location hierarchy', error);
        }
    };

    const fetchUsers = async (page = 1, searchTerm = '', country = '', state = '', city = '') => {
        setLoading(true);
        try {
            let url = `/admin/users?page=${page}&limit=20&search=${searchTerm}`;
            if (country) url += `&country=${encodeURIComponent(country)}`;
            if (state) url += `&state=${encodeURIComponent(state)}`;
            if (city) url += `&city=${encodeURIComponent(city)}`;

            const response = await api.get(url);
            setUsers(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocationData = async () => {
        setLoading(true);
        try {
            const [statsRes, locationRes] = await Promise.all([
                api.get('/admin/location/stats'),
                api.get('/admin/users/by-location')
            ]);
            setLocationStats(statsRes.data);
            setLocationData(locationRes.data);
        } catch (error) {
            console.error('Failed to fetch location data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users/by-group');
            setGroupData(response.data);
        } catch (error) {
            console.error('Failed to fetch group data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'all') {
            fetchUsers();
            fetchLocationHierarchy(); // Load location data for filters
        } else if (viewMode === 'by-location') {
            fetchLocationData();
        } else if (viewMode === 'by-group') {
            fetchGroupData();
            fetchLocationHierarchy(); // Load location data for hierarchical view
        }
    }, [viewMode]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers(1, search, filterCountry, filterState, filterCity);
    };

    const handleAction = async (userId: string, action: string) => {
        setActionLoading(userId);
        try {
            switch (action) {
                case 'suspend':
                    await api.put(`/admin/users/${userId}/suspend`);
                    break;
                case 'unsuspend':
                    await api.put(`/admin/users/${userId}/unsuspend`);
                    break;
                case 'ban':
                    if (!window.confirm('Are you sure you want to ban this user?')) return;
                    await api.put(`/admin/users/${userId}/ban`);
                    break;
                case 'promote':
                    if (!window.confirm('Promote this user to admin?')) return;
                    await api.put(`/admin/users/${userId}/promote`);
                    break;
                case 'demote':
                    if (!window.confirm('Demote this user from admin?')) return;
                    await api.put(`/admin/users/${userId}/demote`);
                    break;
                case 'reset':
                    if (!window.confirm('Reset password for this user?')) {
                        setActionLoading(null);
                        return;
                    }
                    const res = await api.post(`/admin/users/${userId}/reset-password`);
                    alert(`Temporary password: ${res.data.temporaryPassword}`);
                    break;
                case 'delete':
                    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
                    await api.delete(`/admin/users/${userId}`);
                    break;
            }
            fetchUsers(pagination.page, search);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const viewUserDetails = async (userId: string) => {
        try {
            const response = await api.get(`/admin/users/${userId}`);
            setSelectedUser(response.data.user);
            setShowModal(true);
        } catch (error) {
            alert('Failed to load user details');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            suspended: 'bg-yellow-100 text-yellow-800',
            banned: 'bg-red-100 text-red-800'
        };
        return (
            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${styles[status] || styles.active}`}>
                {status || 'active'}
            </span>
        );
    };

    const getRoleBadge = (role: string) => {
        return (
            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                {role}
            </span>
        );
    };

    // Tab buttons
    const TabButton = ({ mode, label, icon: Icon }: { mode: ViewMode; label: string; icon: any }) => (
        <button
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );

    // Location View Component
    const LocationView = () => (
        <div className="space-y-6">
            {/* Stats Cards */}
            {locationStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Users</p>
                                <p className="text-xl font-bold">{locationStats.totalUsers}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <MapPin className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">With Location</p>
                                <p className="text-xl font-bold">{locationStats.usersWithLocation}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Globe className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">No Location</p>
                                <p className="text-xl font-bold">{locationStats.usersWithoutLocation}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Building2 className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Coverage</p>
                                <p className="text-xl font-bold">{locationStats.locationCoverage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Countries */}
                {locationStats?.topCountries && locationStats.topCountries.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Globe className="h-5 w-5 text-blue-500" />
                            Top Countries
                        </h3>
                        <div className="space-y-3">
                            {locationStats.topCountries.map((c: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="font-medium">{c.country}</span>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">{c.count} users</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Cities */}
                {locationStats?.topCities && locationStats.topCities.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-green-500" />
                            Top Cities
                        </h3>
                        <div className="space-y-3">
                            {locationStats.topCities.map((c: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium">{c.city}</span>
                                        <span className="text-gray-400 text-sm ml-2">{c.country}</span>
                                    </div>
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">{c.count} users</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Users by Country */}
            {locationData?.byCountry && Object.keys(locationData.byCountry).length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold">Users by Country</h3>
                    </div>
                    <div className="divide-y">
                        {Object.entries(locationData.byCountry).map(([country, data]: [string, any]) => (
                            <div key={country} className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-blue-500" />
                                        <span className="font-semibold">{country}</span>
                                    </div>
                                    <span className="text-sm text-gray-500">{data.count} users</span>
                                </div>
                                <div className="ml-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {data.users.slice(0, 6).map((user: any) => (
                                        <div key={user.id} className="text-sm bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            <div className="font-medium truncate text-gray-900">{user.name}</div>
                                            <div className="text-gray-500 text-xs truncate mb-2">{user.email}</div>
                                            <div className="space-y-0.5 text-xs">
                                                {user.address && (
                                                    <div className="text-gray-600">📍 {user.address}</div>
                                                )}
                                                <div className="text-gray-600">
                                                    🏙️ {[user.city, user.state].filter(Boolean).join(', ') || 'N/A'}
                                                </div>
                                                {user.zipCode && (
                                                    <div className="text-gray-500">📮 ZIP: {user.zipCode}</div>
                                                )}
                                                {user.latitude && user.longitude && (
                                                    <div className="text-gray-400 pt-1">
                                                        📐 {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {data.users.length > 6 && (
                                        <div className="text-sm text-gray-400 flex items-center">
                                            +{data.users.length - 6} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(!locationData?.byCountry || Object.keys(locationData.byCountry).length === 0) && !loading && (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No users have shared their location yet.</p>
                    <p className="text-sm mt-2">Location data will appear here once users enable location services in the mobile app.</p>
                </div>
            )}
        </div>
    );

    // Group View Component
    const GroupView = () => (
        <div className="space-y-6">
            {/* Summary Cards */}
            {groupData?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Groups</p>
                                <p className="text-xl font-bold">{groupData.summary.totalGroups}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Users in Groups</p>
                                <p className="text-xl font-bold">{groupData.summary.usersInGroups}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Users className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">No Group</p>
                                <p className="text-xl font-bold">{groupData.summary.usersWithoutGroup}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Groups List */}
            {groupData?.groups && groupData.groups.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold">Groups & Members</h3>
                    </div>
                    <div className="divide-y">
                        {groupData.groups.map((group) => (
                            <div key={group.id} className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-500" />
                                        <span className="font-semibold">{group.name}</span>
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                                        {group.memberCount} members
                                    </span>
                                </div>
                                <div className="ml-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {group.members.map((member) => (
                                        <div key={member.id} className="text-sm bg-gray-50 rounded p-2">
                                            <div className="font-medium truncate">{member.name}</div>
                                            <div className="text-gray-500 text-xs truncate">{member.email}</div>
                                            {member.location && (
                                                <div className="text-gray-400 text-xs flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {member.location}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Users without group */}
            {groupData?.usersWithoutGroup && groupData.usersWithoutGroup.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold text-yellow-600">Users Without a Group</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {groupData.usersWithoutGroup.map((user: any) => (
                            <div key={user.id} className="text-sm bg-yellow-50 rounded p-3 border border-yellow-200">
                                <div className="font-medium truncate">{user.name}</div>
                                <div className="text-gray-500 text-xs truncate">{user.email}</div>
                                {user.location && (
                                    <div className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3" />
                                        {user.location}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hierarchical Location Groups */}
            {locationHierarchy && locationHierarchy.hierarchy.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-green-600" />
                            <h3 className="text-lg font-semibold">Users by Location</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Hierarchical view: Country → State → City</p>
                    </div>
                    <div className="divide-y">
                        {locationHierarchy.hierarchy.map((country) => (
                            <details key={country.name} className="group">
                                <summary className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-green-600" />
                                        <span className="font-semibold">{country.name}</span>
                                    </div>
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                                        {country.userCount} users
                                    </span>
                                </summary>
                                <div className="pl-8 pb-4">
                                    {country.states.map((state: any) => (
                                        <details key={state.name} className="ml-4 mt-2">
                                            <summary className="cursor-pointer hover:bg-gray-50 p-2 rounded flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-blue-500" />
                                                    <span className="font-medium">{state.name}</span>
                                                </div>
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                                    {state.userCount} users
                                                </span>
                                            </summary>
                                            <div className="ml-6 mt-2 flex flex-wrap gap-2">
                                                {state.cities.map((city: string) => (
                                                    <span key={city} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                                                        <MapPin className="h-3 w-3 text-gray-500" />
                                                        {city}
                                                    </span>
                                                ))}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // All Users View (Original)
    const AllUsersView = () => (
        <>
            {/* Search and Filters */}
            <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                        Search
                    </button>
                </form>

                {/* Location Filters */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">Filter by Location:</span>
                    </div>
                    <select
                        value={filterCountry}
                        onChange={(e) => {
                            setFilterCountry(e.target.value);
                            setFilterState('');
                            setFilterCity('');
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Countries</option>
                        {locationHierarchy?.allCountries.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        value={filterState}
                        onChange={(e) => {
                            setFilterState(e.target.value);
                            setFilterCity('');
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All States</option>
                        {locationHierarchy?.allStates.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Cities</option>
                        {locationHierarchy?.allCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            fetchUsers(1, search, filterCountry, filterState, filterCity);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                        Apply Filters
                    </button>
                    {(filterCountry || filterState || filterCity) && (
                        <button
                            onClick={() => {
                                setFilterCountry('');
                                setFilterState('');
                                setFilterCity('');
                                fetchUsers(1, search);
                            }}
                            className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm underline"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Joined</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-600">
                                                {user.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div className="ml-4">
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                            <div className="text-xs text-gray-400">ID: {user.customId}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                                <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                                <td className="px-6 py-4">
                                    {user.city || user.country ? (
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                                                <MapPin className="h-3 w-3 text-blue-500" />
                                                {[user.city, user.state].filter(Boolean).join(', ')}
                                            </div>
                                            {user.country && (
                                                <div className="text-xs text-gray-500 pl-4">
                                                    {user.country}
                                                </div>
                                            )}
                                            {user.zipCode && (
                                                <div className="text-xs text-gray-400 pl-4">
                                                    ZIP: {user.zipCode}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => viewUserDetails(user.id)}
                                            className="p-1 text-gray-400 hover:text-blue-600"
                                            title="View Details"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>

                                        {user.role !== 'admin' && (
                                            <>
                                                {user.status === 'active' ? (
                                                    <button
                                                        onClick={() => handleAction(user.id, 'suspend')}
                                                        className="p-1 text-gray-400 hover:text-yellow-600"
                                                        title="Suspend"
                                                        disabled={actionLoading === user.id}
                                                    >
                                                        <ShieldOff className="h-4 w-4" />
                                                    </button>
                                                ) : user.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => handleAction(user.id, 'unsuspend')}
                                                        className="p-1 text-gray-400 hover:text-green-600"
                                                        title="Unsuspend"
                                                        disabled={actionLoading === user.id}
                                                    >
                                                        <Shield className="h-4 w-4" />
                                                    </button>
                                                ) : null}

                                                <button
                                                    onClick={() => handleAction(user.id, 'promote')}
                                                    className="p-1 text-gray-400 hover:text-purple-600"
                                                    title="Promote to Admin"
                                                    disabled={actionLoading === user.id}
                                                >
                                                    <UserCheck className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleAction(user.id, 'reset')}
                                                    className="p-1 text-gray-400 hover:text-blue-600"
                                                    title="Reset Password"
                                                    disabled={actionLoading === user.id}
                                                >
                                                    <Key className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleAction(user.id, 'delete')}
                                                    className="p-1 text-gray-400 hover:text-red-600"
                                                    title="Delete"
                                                    disabled={actionLoading === user.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
                    <div className="text-sm text-gray-500">
                        Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchUsers(pagination.page - 1, search, filterCountry, filterState, filterCity)}
                            disabled={pagination.page <= 1}
                            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => fetchUsers(pagination.page + 1, search, filterCountry, filterState, filterCity)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    if (loading && viewMode === 'all' && users.length === 0) return <div className="flex items-center justify-center h-64">Loading...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Users</h1>
                <div className="text-sm text-gray-500">
                    Total: {pagination.total} users
                </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex gap-2 flex-wrap">
                <TabButton mode="all" label="All Users" icon={Users} />
                <TabButton mode="by-location" label="By Location" icon={MapPin} />
                <TabButton mode="by-group" label="By Group" icon={Users} />
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Content based on view mode */}
            {!loading && viewMode === 'all' && <AllUsersView />}
            {!loading && viewMode === 'by-location' && <LocationView />}
            {!loading && viewMode === 'by-group' && <GroupView />}

            {/* User Details Modal */}
            {showModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">User Details</h2>
                        <div className="space-y-3">
                            <div><strong>Name:</strong> {selectedUser.name}</div>
                            <div><strong>Email:</strong> {selectedUser.email}</div>
                            <div><strong>Custom ID:</strong> {selectedUser.customId}</div>
                            <div><strong>Role:</strong> {getRoleBadge(selectedUser.role)}</div>
                            <div><strong>Status:</strong> {getStatusBadge(selectedUser.status)}</div>

                            {/* Extended Location Section */}
                            {(selectedUser.city || selectedUser.country || selectedUser.latitude) && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                                        <MapPin className="h-4 w-4" />
                                        Location Details
                                    </h3>
                                    <div className="space-y-1 text-sm">
                                        {selectedUser.address && (
                                            <div><span className="text-gray-500">Address:</span> {selectedUser.address}</div>
                                        )}
                                        {selectedUser.city && (
                                            <div><span className="text-gray-500">City:</span> {selectedUser.city}</div>
                                        )}
                                        {selectedUser.state && (
                                            <div><span className="text-gray-500">State:</span> {selectedUser.state}</div>
                                        )}
                                        {selectedUser.zipCode && (
                                            <div><span className="text-gray-500">ZIP Code:</span> {selectedUser.zipCode}</div>
                                        )}
                                        {selectedUser.country && (
                                            <div><span className="text-gray-500">Country:</span> {selectedUser.country}</div>
                                        )}
                                        {selectedUser.latitude && selectedUser.longitude && (
                                            <div className="pt-1 text-xs text-gray-400">
                                                Coordinates: {selectedUser.latitude.toFixed(4)}, {selectedUser.longitude.toFixed(4)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</div>
                            {selectedUser.lastLoginAt && (
                                <div><strong>Last Login:</strong> {new Date(selectedUser.lastLoginAt).toLocaleString()}</div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowModal(false)}
                            className="mt-6 w-full rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
