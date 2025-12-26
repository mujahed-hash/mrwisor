import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Trash2, Search, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';

interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    createdAt: string;
    payer?: { name: string; email: string };
    Group?: { name: string };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [search, setSearch] = useState('');

    const fetchExpenses = async (page = 1, searchTerm = '') => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/expenses?page=${page}&limit=20&search=${searchTerm}`);
            setExpenses(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchExpenses(1, search);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this expense? This cannot be undone.')) return;
        try {
            await api.delete(`/admin/expenses/${id}`);
            fetchExpenses(pagination.page, search);
        } catch (error) {
            alert('Failed to delete expense');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (loading && expenses.length === 0) return <div className="flex items-center justify-center h-64">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
                <div className="text-sm text-gray-500">
                    Total: {pagination.total} expenses
                </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Search
                </button>
            </form>

            {/* Table */}
            <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expense</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Paid By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Group</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <Receipt className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="font-medium text-gray-900">{expense.description}</div>
                                            <div className="text-sm text-gray-500">{expense.category}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{expense.payer?.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">{expense.payer?.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {expense.Group?.name ? (
                                        <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                                            {expense.Group.name}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">Personal</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-gray-900">
                                        {formatCurrency(expense.amount)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(expense.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(expense.id)}
                                        className="p-1 text-gray-400 hover:text-red-600"
                                        title="Delete Expense"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fetchExpenses(pagination.page - 1, search)}
                            disabled={pagination.page === 1}
                            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-3 py-1 text-sm">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => fetchExpenses(pagination.page + 1, search)}
                            disabled={pagination.page === pagination.totalPages}
                            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
