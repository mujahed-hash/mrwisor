import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { useState, useCallback, useEffect } from 'react';
import { getApiUrl } from '@/lib/api-config';

interface LocationData {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    state?: string;
    zipCode?: string;
    address?: string;
}

export function useLocation() {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | null>(null);

    // Check permission status
    const checkPermission = useCallback(async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                // Native platforms (iOS/Android)
                const status = await Geolocation.checkPermissions();
                setPermissionStatus(status.location as 'granted' | 'denied' | 'prompt');
                return status.location;
            } else {
                // Web platform
                if ('permissions' in navigator) {
                    const result = await navigator.permissions.query({ name: 'geolocation' });
                    const status = result.state as 'granted' | 'denied' | 'prompt';
                    setPermissionStatus(status);
                    return status;
                }
                return 'prompt';
            }
        } catch (err) {
            console.error('Error checking permission:', err);
            return 'prompt';
        }
    }, []);

    // Request permission
    const requestPermission = useCallback(async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                const status = await Geolocation.requestPermissions();
                setPermissionStatus(status.location as 'granted' | 'denied' | 'prompt');
                return status.location === 'granted';
            }
            // For web, permission is requested when getting location
            return true;
        } catch (err) {
            console.error('Error requesting permission:', err);
            return false;
        }
    }, []);

    // Get current location
    const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
        setLoading(true);
        setError(null);

        try {
            let coords: { latitude: number; longitude: number };

            if (Capacitor.isNativePlatform()) {
                // Native platform - use Capacitor
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000
                });
                coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
            } else {
                // Web platform - use browser API
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000
                    });
                });
                coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
            }

            // Reverse geocode to get full address details
            let city: string | undefined;
            let country: string | undefined;
            let state: string | undefined;
            let zipCode: string | undefined;
            let address: string | undefined;

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`
                );
                const data = await response.json();

                if (data.address) {
                    // Extract city (can be city, town, village, or municipality)
                    city = data.address.city || data.address.town || data.address.village || data.address.municipality;

                    // Extract country
                    country = data.address.country;

                    // Extract state/province/region
                    state = data.address.state || data.address.province || data.address.region;

                    // Extract postal/zip code
                    zipCode = data.address.postcode;

                    // Build a readable address string
                    const addressParts = [];
                    if (data.address.road) addressParts.push(data.address.road);
                    if (data.address.house_number) addressParts.unshift(data.address.house_number);
                    if (data.address.suburb) addressParts.push(data.address.suburb);
                    if (data.address.neighbourhood) addressParts.push(data.address.neighbourhood);
                    address = addressParts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',');
                }
            } catch (geoError) {
                console.warn('Reverse geocoding failed:', geoError);
            }

            const locationData: LocationData = {
                ...coords,
                city,
                country,
                state,
                zipCode,
                address
            };

            setLocation(locationData);
            return locationData;
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to get location';
            setError(errorMessage);
            console.error('Location error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update location on server
    const updateLocationOnServer = useCallback(async (locationData: LocationData) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return false;

            // Use getApiUrl for mobile compatibility
            const response = await fetch(getApiUrl('/api/users/location'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(locationData)
            });

            if (!response.ok) {
                console.error('Location update failed:', response.status, response.statusText);
            }
            return response.ok;
        } catch (err) {
            console.error('Error updating location on server:', err);
            return false;
        }
    }, []);

    // Get and update location in one call
    const refreshLocation = useCallback(async () => {
        const locationData = await getCurrentLocation();
        if (locationData) {
            await updateLocationOnServer(locationData);
        }
        return locationData;
    }, [getCurrentLocation, updateLocationOnServer]);

    // Check permission on mount
    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    return {
        location,
        loading,
        error,
        permissionStatus,
        checkPermission,
        requestPermission,
        getCurrentLocation,
        updateLocationOnServer,
        refreshLocation
    };
}
