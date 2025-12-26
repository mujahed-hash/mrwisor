import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, XCircle, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";

interface LocationTarget {
    country?: string;
    state?: string;
    city?: string;
}

interface Ad {
    id: string;
    title: string;
    content: string;
    type: 'TOP_BANNER' | 'BOTTOM_STICKY' | 'FEED';
    isActive: boolean;
    mediaUrls?: string[];
    targetLocations?: LocationTarget[];
}

interface LocationHierarchy {
    allCountries: string[];
    allStates: string[];
    allCities: string[];
    hierarchy: {
        name: string;
        userCount: number;
        states: { name: string; userCount: number; cities: string[] }[];
    }[];
}

export default function AdsPage() {
    const [ads, setAds] = useState<Ad[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Ad | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState<'TOP_BANNER' | 'BOTTOM_STICKY' | 'FEED'>("TOP_BANNER");
    const [isActive, setIsActive] = useState(true);
    const [mediaUrlInput, setMediaUrlInput] = useState("");
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);

    // Location targeting state
    const [targetLocations, setTargetLocations] = useState<LocationTarget[]>([]);
    const [locationHierarchy, setLocationHierarchy] = useState<LocationHierarchy | null>(null);
    const [selectedCountry, setSelectedCountry] = useState("");
    const [selectedState, setSelectedState] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [targetAll, setTargetAll] = useState(true);

    // Fetch location hierarchy when dialog opens
    const fetchLocationHierarchy = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch('/api/admin/location/hierarchy', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLocationHierarchy(data);
            }
        } catch (err) {
            console.error('Failed to fetch location hierarchy:', err);
        }
    };

    const fetchAds = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch('/api/ads', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch ads');

            // Check if response has content before parsing
            const text = await response.text();
            if (!text) {
                setAds([]);
                return;
            }
            const data = JSON.parse(text);
            setAds(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load ads");
            setAds([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAds();
    }, []);

    const [inputType, setInputType] = useState<'url' | 'file'>('url');
    const [isUploading, setIsUploading] = useState(false);

    const resetForm = () => {
        setTitle("");
        setContent("");
        setType("TOP_BANNER");
        setIsActive(true);
        setMediaUrls([]);
        setMediaUrlInput("");
        setEditingAd(null);
        setInputType('url');
        setTargetLocations([]);
        setTargetAll(true);
        setSelectedCountry("");
        setSelectedState("");
        setSelectedCity("");
    };

    const addLocationTarget = () => {
        if (!selectedCountry && !selectedState && !selectedCity) return;

        const newTarget: LocationTarget = {};
        if (selectedCountry) newTarget.country = selectedCountry;
        if (selectedState) newTarget.state = selectedState;
        if (selectedCity) newTarget.city = selectedCity;

        // Check for duplicates
        const exists = targetLocations.some(t =>
            t.country === newTarget.country &&
            t.state === newTarget.state &&
            t.city === newTarget.city
        );

        if (!exists) {
            setTargetLocations([...targetLocations, newTarget]);
        }

        setSelectedCountry("");
        setSelectedState("");
        setSelectedCity("");
    };

    const removeLocationTarget = (index: number) => {
        setTargetLocations(targetLocations.filter((_, i) => i !== index));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Since we are in the admin portal, we might need full URL or proxy
            // Assuming proxy is set up correctly for /api
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData, // No Authorization needed for upload usually, or add if protected
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setMediaUrls([...mediaUrls, data.url]);
            toast.success("File uploaded");

            // Reset file input
            e.target.value = '';
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload file");
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('admin_token');
            const url = editingAd ? `/api/ads/${editingAd.id}` : '/api/ads';
            const method = editingAd ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    content,
                    type,
                    isActive,
                    mediaUrls,
                    targetLocations: targetAll ? [] : targetLocations
                }),
            });

            if (response.status === 401 || response.status === 403) {
                toast.error("Session expired. Please login again.");
                return;
            }

            if (!response.ok) throw new Error('Failed to save ad');

            toast.success(editingAd ? "Ad updated" : "Ad created");
            setIsDialogOpen(false);
            resetForm();
            fetchAds();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save ad");
        }
    };

    const addMediaUrl = () => {
        if (!mediaUrlInput.trim()) return;
        setMediaUrls([...mediaUrls, mediaUrlInput.trim()]);
        setMediaUrlInput("");
    };

    const removeMediaUrl = (index: number) => {
        setMediaUrls(mediaUrls.filter((_, i) => i !== index));
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this ad?")) return;
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`/api/ads/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                toast.error("Session expired. Please login again.");
                return;
            }

            if (!response.ok) throw new Error('Failed to delete');
            toast.success("Ad deleted");
            fetchAds();
        } catch (error) {
            toast.error("Failed to delete ad");
        }
    };

    const openEdit = (ad: Ad & { mediaUrls?: string[]; targetLocations?: LocationTarget[] }) => {
        setEditingAd(ad);
        setTitle(ad.title ?? "");
        setContent(ad.content ?? "");
        setType(ad.type ?? "TOP_BANNER");
        setIsActive(ad.isActive ?? true);
        setMediaUrls(ad.mediaUrls ?? []);
        setMediaUrlInput("");
        setInputType('url');
        setTargetLocations(ad.targetLocations ?? []);
        setTargetAll(!ad.targetLocations || ad.targetLocations.length === 0);
        fetchLocationHierarchy();
        setIsDialogOpen(true);
    };

    const openNew = () => {
        resetForm();
        fetchLocationHierarchy();
        setIsDialogOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-800">Ads Management</h1>
                    <p className="text-gray-500">Manage system-wide advertisements</p>
                </div>
                <button
                    onClick={openNew}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Plus className="mr-2 h-4 w-4" /> New Ad
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {ads.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">No ads found</td>
                                </tr>
                            ) : ads.map((ad) => (
                                <tr key={ad.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{ad.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ad.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {ad.isActive ? (
                                            <span className="inline-flex items-center text-green-600 text-sm"><CheckCircle2 className="mr-1 h-3 w-3" /> Active</span>
                                        ) : (
                                            <span className="inline-flex items-center text-gray-400 text-sm"><XCircle className="mr-1 h-3 w-3" /> Inactive</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button onClick={() => openEdit(ad)} className="text-gray-600 hover:text-gray-900 p-1"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => handleDelete(ad.id)} className="text-red-500 hover:text-red-700 p-1 ml-2"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Simple Modal Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4">{editingAd ? 'Edit Ad' : 'Create New Ad'}</h2>
                            <form onSubmit={onSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={title ?? ""}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Summer Sale Banner"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        value={type ?? "TOP_BANNER"}
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="TOP_BANNER">Top Banner</option>
                                        <option value="BOTTOM_STICKY">Bottom Sticky</option>
                                        <option value="FEED">In-Feed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
                                    <textarea
                                        value={content ?? ""}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Get 50% off premium now!"
                                        rows={3}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Can contain HTML tags</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Media URLs (Images/Videos)</label>
                                    <div className="flex gap-2 mb-2">
                                        <div className="flex border rounded-md overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setInputType('url')}
                                                className={`px-3 py-2 text-sm ${inputType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                URL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setInputType('file')}
                                                className={`px-3 py-2 text-sm ${inputType === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                Upload (Open)
                                            </button>
                                        </div>
                                    </div>

                                    {inputType === 'url' ? (
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={mediaUrlInput ?? ""}
                                                onChange={(e) => setMediaUrlInput(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="https://example.com/image.jpg"
                                            />
                                            <button
                                                type="button"
                                                onClick={addMediaUrl}
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="file"
                                                onChange={handleFileUpload}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                accept="image/*,video/*"
                                            />
                                            {isUploading && <Loader2 className="h-5 w-5 animate-spin text-blue-600 self-center" />}
                                        </div>
                                    )}
                                    {mediaUrls.length > 0 && (
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {mediaUrls.map((url, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                                    <span className="truncate flex-1 mr-2" title={url}>{url}</span>
                                                    <button type="button" onClick={() => removeMediaUrl(idx)} className="text-red-500 hover:text-red-700">
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Location Targeting Section */}
                                <div className="border-t pt-4 mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <MapPin className="inline h-4 w-4 mr-1" />
                                        Location Targeting
                                    </label>

                                    <div className="flex items-center mb-3">
                                        <input
                                            type="checkbox"
                                            checked={targetAll}
                                            onChange={(e) => setTargetAll(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 rounded"
                                            id="targetAll"
                                        />
                                        <label htmlFor="targetAll" className="ml-2 text-sm text-gray-700">
                                            Show to all users (no location restriction)
                                        </label>
                                    </div>

                                    {!targetAll && (
                                        <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                                            <div className="grid grid-cols-3 gap-2">
                                                <select
                                                    value={selectedCountry}
                                                    onChange={(e) => {
                                                        setSelectedCountry(e.target.value);
                                                        setSelectedState("");
                                                        setSelectedCity("");
                                                    }}
                                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                >
                                                    <option value="">Country</option>
                                                    {locationHierarchy?.allCountries.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={selectedState}
                                                    onChange={(e) => {
                                                        setSelectedState(e.target.value);
                                                        setSelectedCity("");
                                                    }}
                                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                >
                                                    <option value="">State</option>
                                                    {locationHierarchy?.allStates.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={selectedCity}
                                                    onChange={(e) => setSelectedCity(e.target.value)}
                                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                >
                                                    <option value="">City</option>
                                                    {locationHierarchy?.allCities.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addLocationTarget}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                + Add location target
                                            </button>

                                            {targetLocations.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-xs text-gray-500">Targeting:</p>
                                                    {targetLocations.map((loc, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                                            <span>
                                                                <Globe className="inline h-3 w-3 mr-1 text-blue-500" />
                                                                {[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLocationTarget(idx)}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isActive ?? true}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded"
                                        id="isActive"
                                    />
                                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Active</label>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsDialogOpen(false); resetForm(); }}
                                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
