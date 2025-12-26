import { Capacitor } from '@capacitor/core';

/**
 * API Configuration for SpendSplit
 * 
 * In development (web): Uses Vite proxy (/api -> localhost:5001)
 * In production/mobile: Uses absolute URL from environment variable
 */

// Get base URL based on environment
function getBaseUrl(): string {
    // In native apps, always use the configured API URL
    if (Capacitor.isNativePlatform()) {
        // For production, this should be your deployed server URL
        // Example: 'https://api.spendsplit.com'
        return import.meta.env.VITE_API_URL || 'http://localhost:5001';
    }

    // In web development with Vite, use proxy (empty base = relative URLs work with proxy)
    if (import.meta.env.DEV) {
        return '';
    }

    // Production web build
    return import.meta.env.VITE_API_URL || '';
}

const API_BASE_URL = getBaseUrl();

/**
 * Build full API URL for a given path
 * @param path - API path starting with /api (e.g., '/api/users')
 * @returns Full URL for the API endpoint
 */
export function getApiUrl(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Make an authenticated API request
 * @param path - API path (e.g., '/api/users/me')
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('token');

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    return fetch(getApiUrl(path), {
        ...options,
        headers,
    });
}

export { API_BASE_URL };
