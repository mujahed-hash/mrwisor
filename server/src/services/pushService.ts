
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import db from '../models';

let isFirebaseInitialized = false;

// Initialize Firebase Admin SDK
try {
    // Look for service account file in root or config
    // The user should place 'service-account.json' in the server root
    const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        isFirebaseInitialized = true;
        console.log('✅ Firebase Admin initialized successfully');
    } else {
        console.warn('⚠️ Push Notifications Warning: service-account.json not found in server root. Push notifications will not be sent.');
    }
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
}

interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
}

/**
 * Send push notification to a specific user's devices
 */
export const sendPushNotification = async (userId: string, payload: PushPayload) => {
    if (!isFirebaseInitialized) {
        console.log(`[Mock Push] To User ${userId}: ${payload.title} - ${payload.body}`);
        return;
    }

    try {
        // 1. Get user's device tokens
        const devices = await db.DeviceToken.findAll({ where: { userId } });
        if (!devices || devices.length === 0) {
            return;
        }

        const tokens = devices.map((d: any) => d.token);

        // 2. Construct message
        const message: admin.messaging.MulticastMessage = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            tokens: tokens,
        };

        // 3. Send
        const response = await admin.messaging().sendEachForMulticast(message);

        // 4. Handle invalid tokens (cleanup)
        if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-argument') {
                        invalidTokens.push(tokens[idx]);
                    }
                }
            });

            if (invalidTokens.length > 0) {
                await db.DeviceToken.destroy({ where: { token: invalidTokens } });
                console.log(`Cleaned up ${invalidTokens.length} invalid tokens for user ${userId}`);
            }
        }

        // Update last used for successful ones? (Optional optimization)

    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

/**
 * Register a device token for a user
 */
export const registerDeviceToken = async (userId: string, token: string, platform: 'ios' | 'android' | 'web' = 'web') => {
    try {
        await db.DeviceToken.upsert({
            userId,
            token,
            platform,
            lastUsed: new Date()
        });
        console.log(`Device token registered for user ${userId}`);
        return true;
    } catch (error) {
        console.error('Error registering device token:', error);
        return false;
    }
};
