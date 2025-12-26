import { useState, useEffect } from 'react';
import { DollarSign, Users, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import api from '../lib/api';

interface PaymentData {
    id: string;
    amount: number;
    currency: string;
    date: string;
    notes?: string;
    payer?: { id: string; name: string; email: string };
    payee?: { id: string; name: string; email: string };
    Group?: { id: string; name: string };
}

interface BalanceData {
    user: { id: string; name: string; email: string };
    owedToUser: number;
    userOwes: number;
    paymentsReceived: number;
    paymentsMade: number;
    netBalance: number;
}

export default function Payments() {
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [balances, setBalances] = useState<BalanceData[]>([]);
    const [summary, setSummary] = useState({ totalVolume: 0, totalPayments: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'payments' | 'balances'>('payments');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchPayments = async () => {
        try {
            const res = await api.get(`/admin/payments?page=${page}&limit=20`);
            setPayments(res.data.data);
            setTotalPages(res.data.pagination.totalPages);
            setSummary(res.data.summary);
        } catch (error) {
            console.error('Error fetching payments:', error);
        }
    };

    const fetchBalances = async () => {
        try {
            const res = await api.get('/admin/balances');
            setBalances(res.data.balances);
        } catch (error) {
            console.error('Error fetching balances:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchPayments(), fetchBalances()]);
            setLoading(false);
        };
        loadData();
    }, [page]);

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
                <p className="text-gray-500">Payment history and outstanding balances</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Volume</p>
                            <p className="text-xl font-bold">{formatCurrency(summary.totalVolume)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <ArrowUpRight className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Payments</p>
                            <p className="text-xl font-bold">{summary.totalPayments}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Users with Balance</p>
                            <p className="text-xl font-bold">{balances.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'payments'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Payment History
                </button>
                <button
                    onClick={() => setActiveTab('balances')}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'balances'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Outstanding Balances
                </button>
            </div>

            {/* Payment History Table */}
            {activeTab === 'payments' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No payments recorded yet
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(payment.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.payer?.name || 'Unknown'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {payment.payer?.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.payee?.name || 'Unknown'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {payment.payee?.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-semibold text-green-600">
                                                {formatCurrency(payment.amount, payment.currency)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.Group?.name || 'Personal'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 bg-white border rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 bg-white border rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Outstanding Balances Table */}
            {activeTab === 'balances' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owed to User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Owes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Balance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {balances.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        All balances are settled!
                                    </td>
                                </tr>
                            ) : (
                                balances.map((balance) => (
                                    <tr key={balance.user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {balance.user.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {balance.user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-green-600 flex items-center gap-1">
                                                <ArrowDownRight className="w-4 h-4" />
                                                {formatCurrency(balance.owedToUser)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-red-600 flex items-center gap-1">
                                                <ArrowUpRight className="w-4 h-4" />
                                                {formatCurrency(balance.userOwes)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-semibold ${balance.netBalance > 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {balance.netBalance > 0 ? '+' : ''}{formatCurrency(balance.netBalance)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
