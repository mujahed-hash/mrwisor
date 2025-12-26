import { useState, useEffect } from 'react';
import { Bell, Send, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface NotificationStats {
    total: number;
    unread: number;
    last24Hours: number;
}

export default function Notifications() {
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/notifications/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching notification stats:', error);
        }
        setLoading(false);
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        setSending(true);
        setResult(null);

        try {
            const res = await api.post('/admin/notifications/broadcast', {
                title: title.trim(),
                message: message.trim(),
                type: 'ANNOUNCEMENT'
            });
            setResult({
                success: true,
                message: `Notification sent to ${res.data.recipientCount} users!`
            });
            setTitle('');
            setMessage('');
            fetchStats();
        } catch (error: any) {
            setResult({
                success: false,
                message: error.response?.data?.error || 'Failed to send notification'
            });
        }
        setSending(false);
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
                <h1 className="text-2xl font-bold text-gray-900">Notification Control</h1>
                <p className="text-gray-500">Send announcements to all users</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Bell className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Notifications</p>
                                <p className="text-xl font-bold">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Unread</p>
                                <p className="text-xl font-bold">{stats.unread}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Sent (24h)</p>
                                <p className="text-xl font-bold">{stats.last24Hours}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Notification Form */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Send Global Announcement</h2>

                {result && (
                    <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${result.success
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {result.success
                            ? <CheckCircle className="w-5 h-5" />
                            : <AlertCircle className="w-5 h-5" />
                        }
                        {result.message}
                    </div>
                )}

                <form onSubmit={handleSendNotification} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Announcement title..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write your announcement message..."
                            rows={4}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={sending || !title.trim() || !message.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                        {sending ? 'Sending...' : 'Send to All Users'}
                    </button>
                </form>
            </div>
        </div>
    );
}
