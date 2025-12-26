
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

const API_URL = '/api';

export const PushManager = {
    // Check permission status
    checkPermissions: async () => {
        if (!Capacitor.isNativePlatform()) return 'granted'; // Web simulation

        const status = await PushNotifications.checkPermissions();
        return status.receive;
    },

    // Request permission
    requestPermissions: async () => {
        if (!Capacitor.isNativePlatform()) return 'granted';

        const status = await PushNotifications.requestPermissions();
        return status.receive;
    },

    // Register device and send token to backend
    register: async () => {
        if (!Capacitor.isNativePlatform()) {
            console.log('Push Notifications: Web platform - skipping native registration');
            return;
        }

        // 1. Add Listeners
        await PushManager.addListeners();

        // 2. Register with FCM/APNs
        await PushNotifications.register();
    },

    // Add event listeners
    addListeners: async () => {
        await PushNotifications.removeAllListeners();

        // Registration success
        await PushNotifications.addListener('registration', async token => {
            console.log('Push Registration Token:', token.value);
            await PushManager.sendTokenToBackend(token.value);
        });

        // Registration error
        await PushNotifications.addListener('registrationError', err => {
            console.error('Push Registration Error:', err.error);
        });

        // Received notification (foreground)
        await PushNotifications.addListener('pushNotificationReceived', notification => {
            console.log('Push Received:', notification);
            toast(notification.title || 'New Notification', {
                description: notification.body,
                action: {
                    label: 'View',
                    onClick: () => console.log('View notification clicked')
                }
            });
        });

        // Action performed (tapped notification)
        await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
            console.log('Push Action Performed:', notification.actionId, notification.inputValue);
            // Navigate to specifics if needed
        });
    },

    // Send token to our backend
    sendTokenToBackend: async (token: string) => {
        try {
            const authToken = localStorage.getItem('token');
            if (!authToken) return;

            const response = await fetch(`${API_URL}/push/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token,
                    platform: Capacitor.getPlatform() // 'ios' or 'android'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to register token with backend');
            }
            console.log('✅ Device token registered with backend');
        } catch (error) {
            console.error('❌ Error sending token to backend:', error);
        }
    }
};
