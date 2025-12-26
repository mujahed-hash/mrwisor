import { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

interface OCRStats {
    totalWithReceipt: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
    successRate: string;
}

interface FailedScan {
    id: string;
    description: string;
    amount: number;
    receipt: string;
    createdAt: string;
    scanStatus: string;
    payer?: { name: string; email: string };
}

export default function OCRManagement() {
    const [stats, setStats] = useState<OCRStats | null>(null);
    const [failedScans, setFailedScans] = useState<FailedScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/ocr/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching OCR stats:', error);
        }
    };

    const fetchFailedScans = async () => {
        try {
            const res = await api.get(`/admin/ocr/failed?page=${page}&limit=10`);
            setFailedScans(res.data.data);
            setTotalPages(res.data.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching failed scans:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchStats(), fetchFailedScans()]);
            setLoading(false);
        };
        loadData();
    }, [page]);

    const handleRetry = async (id: string) => {
        setRetrying(id);
        try {
            await api.post(`/admin/ocr/${id}/retry`);
            await fetchStats();
            await fetchFailedScans();
        } catch (error) {
            console.error('Error retrying OCR:', error);
        }
        setRetrying(null);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
                <h1 className="text-2xl font-bold text-gray-900">OCR Management</h1>
                <p className="text-gray-500">Receipt scanning statistics and failed scan recovery</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <Camera className="w-8 h-8 text-blue-500 mb-2" />
                            <p className="text-2xl font-bold">{stats.totalWithReceipt}</p>
                            <p className="text-xs text-gray-500">With Receipt</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                            <p className="text-2xl font-bold">{stats.completed}</p>
                            <p className="text-xs text-gray-500">Completed</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <XCircle className="w-8 h-8 text-red-500 mb-2" />
                            <p className="text-2xl font-bold">{stats.failed}</p>
                            <p className="text-xs text-gray-500">Failed</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <RefreshCw className="w-8 h-8 text-yellow-500 mb-2" />
                            <p className="text-2xl font-bold">{stats.processing}</p>
                            <p className="text-xs text-gray-500">Processing</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <Clock className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-2xl font-bold">{stats.pending}</p>
                            <p className="text-xs text-gray-500">Pending</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col items-center">
                            <AlertTriangle className="w-8 h-8 text-purple-500 mb-2" />
                            <p className="text-2xl font-bold">{stats.successRate}</p>
                            <p className="text-xs text-gray-500">Success Rate</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Failed Scans */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Failed Scans</h2>
                    <button
                        onClick={() => { fetchStats(); fetchFailedScans(); }}
                        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                    >
                        Refresh
                    </button>
                </div>

                {failedScans.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                        No failed scans! 🎉
                    </div>
                ) : (
                    <div className="divide-y">
                        {failedScans.map((scan) => (
                            <div key={scan.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                                        {scan.receipt && (
                                            <img
                                                src={`data:image/jpeg;base64,${scan.receipt}`}
                                                alt="Receipt"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{scan.description}</p>
                                        <p className="text-sm text-gray-500">
                                            ${scan.amount} • {scan.payer?.name || 'Unknown'} • {formatDate(scan.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRetry(scan.id)}
                                    disabled={retrying === scan.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${retrying === scan.id ? 'animate-spin' : ''}`} />
                                    {retrying === scan.id ? 'Retrying...' : 'Retry OCR'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

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
        </div>
    );
}
