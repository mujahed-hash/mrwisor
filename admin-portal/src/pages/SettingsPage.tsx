import { useState, useEffect } from "react";
import { Loader2, Settings, Shield, Bell, Database, Zap } from "lucide-react";

interface SettingsState {
    ads_enabled: boolean;
    feature_ocr_enabled: boolean;
    feature_signups_enabled: boolean;
    feature_comments_enabled: boolean;
    maintenance_mode: boolean;
    max_expenses_per_user: number;
    max_groups_per_user: number;
}

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [settings, setSettings] = useState<SettingsState>({
        ads_enabled: false,
        feature_ocr_enabled: true,
        feature_signups_enabled: true,
        feature_comments_enabled: true,
        maintenance_mode: false,
        max_expenses_per_user: 1000,
        max_groups_per_user: 50,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSettings({
                    ads_enabled: data.ads_enabled === 'true',
                    feature_ocr_enabled: data.feature_ocr_enabled !== 'false',
                    feature_signups_enabled: data.feature_signups_enabled !== 'false',
                    feature_comments_enabled: data.feature_comments_enabled !== 'false',
                    maintenance_mode: data.maintenance_mode === 'true',
                    max_expenses_per_user: parseInt(data.max_expenses_per_user) || 1000,
                    max_groups_per_user: parseInt(data.max_groups_per_user) || 50,
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = async (key: string, value: string | boolean | number) => {
        setIsSaving(key);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [key]: String(value) })
            });

            if (response.ok) {
                setSettings(prev => ({ ...prev, [key]: typeof value === 'boolean' ? value : value }));
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            console.error('Failed to update settings', error);
            alert('Failed to update setting');
        } finally {
            setIsSaving(null);
        }
    };

    const Toggle = ({ enabled, onToggle, label, description, settingKey }: any) => (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div>
                <h3 className="text-sm font-medium text-gray-900">{label}</h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <button
                onClick={() => onToggle(!enabled)}
                disabled={isSaving === settingKey}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-600' : 'bg-gray-200'} ${isSaving === settingKey ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-800">System Settings</h1>
                <p className="text-gray-500">Manage global application settings and feature flags</p>
            </div>

            {/* Maintenance Mode Alert */}
            {settings.maintenance_mode && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <div className="flex">
                        <Shield className="h-5 w-5 text-yellow-400 mr-2" />
                        <p className="text-sm text-yellow-700">
                            <strong>Maintenance mode is active.</strong> Users cannot access the application.
                        </p>
                    </div>
                </div>
            )}

            {/* Feature Flags */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-800 flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                        Feature Flags
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Enable or disable application features</p>
                </div>
                <div className="p-6">
                    <Toggle
                        settingKey="feature_signups_enabled"
                        enabled={settings.feature_signups_enabled}
                        onToggle={(val: boolean) => updateSetting('feature_signups_enabled', val)}
                        label="Allow New Signups"
                        description="Allow new users to register for accounts"
                    />
                    <Toggle
                        settingKey="feature_ocr_enabled"
                        enabled={settings.feature_ocr_enabled}
                        onToggle={(val: boolean) => updateSetting('feature_ocr_enabled', val)}
                        label="Receipt OCR"
                        description="Enable automatic receipt scanning and item extraction"
                    />
                    <Toggle
                        settingKey="feature_comments_enabled"
                        enabled={settings.feature_comments_enabled}
                        onToggle={(val: boolean) => updateSetting('feature_comments_enabled', val)}
                        label="Comments"
                        description="Allow users to comment on expenses"
                    />
                    <Toggle
                        settingKey="maintenance_mode"
                        enabled={settings.maintenance_mode}
                        onToggle={(val: boolean) => updateSetting('maintenance_mode', val)}
                        label="Maintenance Mode"
                        description="Block all user access (admin still works)"
                    />
                </div>
            </div>

            {/* Advertisement Settings */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-800 flex items-center">
                        <Bell className="h-5 w-5 mr-2 text-blue-500" />
                        Advertisement Settings
                    </h2>
                </div>
                <div className="p-6">
                    <Toggle
                        settingKey="ads_enabled"
                        enabled={settings.ads_enabled}
                        onToggle={(val: boolean) => updateSetting('ads_enabled', val)}
                        label="Enable Ads"
                        description="Show advertisements to all users across the application"
                    />
                </div>
            </div>

            {/* Limits */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-800 flex items-center">
                        <Database className="h-5 w-5 mr-2 text-purple-500" />
                        Resource Limits
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Set limits to prevent abuse</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Max Expenses per User</label>
                        <div className="mt-1 flex items-center gap-4">
                            <input
                                type="number"
                                value={settings.max_expenses_per_user}
                                onChange={(e) => setSettings(prev => ({ ...prev, max_expenses_per_user: parseInt(e.target.value) || 0 }))}
                                className="w-32 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => updateSetting('max_expenses_per_user', settings.max_expenses_per_user)}
                                disabled={isSaving === 'max_expenses_per_user'}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving === 'max_expenses_per_user' ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Max Groups per User</label>
                        <div className="mt-1 flex items-center gap-4">
                            <input
                                type="number"
                                value={settings.max_groups_per_user}
                                onChange={(e) => setSettings(prev => ({ ...prev, max_groups_per_user: parseInt(e.target.value) || 0 }))}
                                className="w-32 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => updateSetting('max_groups_per_user', settings.max_groups_per_user)}
                                disabled={isSaving === 'max_groups_per_user'}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving === 'max_groups_per_user' ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
