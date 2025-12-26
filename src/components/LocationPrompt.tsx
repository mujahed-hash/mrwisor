import { useState, useEffect } from 'react';
import { MapPin, X, Check } from 'lucide-react';
import { useLocation } from '@/hooks/useLocation';

interface LocationPromptProps {
    onComplete?: () => void;
}

export function LocationPrompt({ onComplete }: LocationPromptProps) {
    const [visible, setVisible] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [checkingServer, setCheckingServer] = useState(true);
    const { permissionStatus, refreshLocation, location } = useLocation();

    useEffect(() => {
        // First check if user already has location saved on the server
        const checkServerLocation = async () => {
            setCheckingServer(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setCheckingServer(false);
                    return;
                }

                const response = await fetch('/api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const user = await response.json();
                    // If user already has location on server, don't show prompt
                    if (user.city || user.country) {
                        localStorage.setItem('userLocationSet', 'true');
                        setCheckingServer(false);
                        return;
                    }
                }
            } catch (err) {
                console.error('Failed to check server location:', err);
            }
            setCheckingServer(false);
        };

        checkServerLocation();
    }, []);

    useEffect(() => {
        // Don't show prompt while checking server
        if (checkingServer) return;

        // Check if we should show the prompt
        const hasSeenPrompt = localStorage.getItem('locationPromptSeen');
        const hasLocation = localStorage.getItem('userLocationSet');

        // Show prompt if:
        // 1. User hasn't seen it before OR
        // 2. Permission is still 'prompt' and no location is set
        if (!hasSeenPrompt && !hasLocation && permissionStatus !== 'granted') {
            // Delay showing the prompt for a smoother UX
            const timer = setTimeout(() => setVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [checkingServer, permissionStatus]);

    const handleAllow = async () => {
        setRequesting(true);
        try {
            const locationData = await refreshLocation();
            if (locationData) {
                setSuccess(true);
                localStorage.setItem('userLocationSet', 'true');
                localStorage.setItem('locationPromptSeen', 'true');
                setTimeout(() => {
                    setVisible(false);
                    onComplete?.();
                }, 1500);
            } else {
                // Location failed but mark as seen
                localStorage.setItem('locationPromptSeen', 'true');
                setVisible(false);
            }
        } catch (err) {
            console.error('Location request failed:', err);
            localStorage.setItem('locationPromptSeen', 'true');
            setVisible(false);
        } finally {
            setRequesting(false);
        }
    };

    const handleSkip = () => {
        localStorage.setItem('locationPromptSeen', 'true');
        setVisible(false);
        onComplete?.();
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header gradient */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-full">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold">Enable Location</h2>
                        </div>
                        <button
                            onClick={handleSkip}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Check className="h-8 w-8 text-green-600" />
                            </div>
                            <p className="text-lg font-medium text-gray-900">Location enabled!</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {location?.city ? `${location.city}, ${location.country}` : 'Your location has been saved'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-600 mb-4">
                                Share your location to get:
                            </p>
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-center gap-3 text-gray-700">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-600">🎯</span>
                                    </div>
                                    <span>Local deals and discounts near you</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-green-600">📊</span>
                                    </div>
                                    <span>Spending insights based on your area</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-purple-600">👥</span>
                                    </div>
                                    <span>Connect with nearby friends easier</span>
                                </li>
                            </ul>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleSkip}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Maybe Later
                                </button>
                                <button
                                    onClick={handleAllow}
                                    disabled={requesting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {requesting ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                            Getting Location...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-4 w-4" />
                                            Allow Location
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Privacy note */}
                {!success && (
                    <div className="px-6 pb-6">
                        <p className="text-xs text-gray-400 text-center">
                            Your location is stored securely and only used to personalize your experience.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
