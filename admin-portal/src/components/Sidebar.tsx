import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, CreditCard, LogOut, Megaphone, Settings, DollarSign, Bell, Shield, Camera, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Users', path: '/users', icon: User },
        { name: 'Groups', path: '/groups', icon: Users },
        { name: 'Expenses', path: '/expenses', icon: CreditCard },
        { name: 'Payments', path: '/payments', icon: DollarSign },
        { name: 'OCR Scans', path: '/ocr', icon: Camera },
        { name: 'User Insights', path: '/insights', icon: BarChart3 },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'Security', path: '/security', icon: Shield },
        { name: 'Ads', path: '/ads', icon: Megaphone },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="flex w-64 flex-col bg-white shadow-md">
            <div className="flex h-16 items-center justify-center border-b px-4">
                <h1 className="text-xl font-bold text-gray-800">Admin Portal</h1>
            </div>
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t p-4">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}
