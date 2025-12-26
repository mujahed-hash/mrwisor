# 🔔 Push Notifications - Firebase Setup Guide

## ✅ What's Already Done

The **entire code infrastructure** for push notifications is complete:
- ✅ Backend: `pushService.ts` with Firebase Admin SDK
- ✅ Database: `DeviceToken` model to store user tokens
- ✅ API Endpoints: `/api/push/register` and `/api/push/test`
- ✅ Frontend: `PushManager.ts` handles permissions and registration
- ✅ UI: Settings toggle integrated
- ✅ Events: Notifications triggered on expense create/update/delete and group invites
- ✅ Credentials: `service-account.json` saved to server

## 📱 What You Need to Do (One-Time Setup)

To enable **real push notifications on iOS and Android**, you need to add Firebase configuration files to your native projects.

---

## Step 1: Firebase Console Setup

### 1.1 Create/Access Your Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. You already have a project: **`pushnotifi-9e8a9`**
3. Select this project

### 1.2 Add Android App
1. In Firebase Console, click **"Add app"** → Select **Android**
2. **Android package name**: `com.wiselyspent.app` (must match `appId` in `capacitor.config.ts`)
3. Click **"Register app"**
4. Download **`google-services.json`**
5. Click **"Next"** → **"Continue to console"**

### 1.3 Add iOS App
1. In Firebase Console, click **"Add app"** → Select **iOS**
2. **iOS bundle ID**: `com.wiselyspent.app` (must match `appId` in `capacitor.config.ts`)
3. Click **"Register app"**
4. Download **`GoogleService-Info.plist`**
5. Click **"Next"** → **"Continue to console"**

---

## Step 2: Place Configuration Files

### Android Configuration
```bash
# From your project root
cp ~/Downloads/google-services.json workspace/shadcn-ui/android/app/
```

**Verify the file structure:**
```
workspace/shadcn-ui/
└── android/
    └── app/
        └── google-services.json  ← Should be here
```

### iOS Configuration
```bash
# From your project root
cp ~/Downloads/GoogleService-Info.plist workspace/shadcn-ui/ios/App/App/
```

**Verify the file structure:**
```
workspace/shadcn-ui/
└── ios/
    └── App/
        └── App/
            └── GoogleService-Info.plist  ← Should be here
```

---

## Step 3: Update Android Build Configuration

The Android app needs the Firebase Gradle plugin. Check if it's already configured:

**File: `workspace/shadcn-ui/android/app/build.gradle`**

At the **very bottom** of the file, add:
```gradle
apply plugin: 'com.google.gms.google-services'
```

**File: `workspace/shadcn-ui/android/build.gradle`**

In the `dependencies` block (at the root level, not inside `buildscript`), add:
```gradle
classpath 'com.google.gms:google-services:4.3.15'
```

---

## Step 4: Sync Capacitor

Run this command from your project root to sync the native projects with your web code:

```bash
cd workspace/shadcn-ui
npx cap sync
```

This will:
- Update Android and iOS projects with the Firebase config files
- Install the `@capacitor/push-notifications` plugin in the native projects
- Prepare the apps for building

---

## Step 5: Build and Test

### Option A: Test on Real Device (Recommended)
Push notifications **do not work on iOS Simulator**. For Android, you need Google Play Services.

#### Android
```bash
npx cap open android
```
- In Android Studio, connect a real device or use an emulator with Google Play Services
- Click **Run** (green play button)

#### iOS
```bash
npx cap open ios
```
- In Xcode, connect a real iOS device
- Select your device in the top bar
- Click **Run** (play button)

### Option B: Test via Expo (if applicable)
If you're using Expo, follow their push notification testing guide.

---

## Step 6: Enable Push Notifications in App

1. Open the app on your device
2. Go to **Settings**
3. Toggle **"Push Notifications"** to **ON**
4. **Grant permission** when prompted by iOS/Android

The app will:
- Request permission from the OS
- Register with FCM/APNs
- Send the device token to your backend (`/api/push/register`)

---

## Step 7: Verify It Works

### Method 1: Trigger a Real Event
1. Create a new expense involving another user
2. They should receive a push notification

### Method 2: Use the Test Endpoint
Use Postman or curl to test:

```bash
curl -X POST http://YOUR_SERVER:5001/api/push/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

You should receive a notification: **"Test Notification - This is a test push notification from Wisely Spent!"**

---

## Troubleshooting

### No notification received?
1. **Check server logs** for: `✅ Firebase Admin initialized successfully`
   - If you see an error, verify `service-account.json` is in `server/` directory
2. **Check device token registration**: Look for `Device token registered for user <userId>` in server logs
3. **Verify permissions**: Go to device Settings → App → Notifications → Ensure enabled
4. **Android**: Ensure you're using a device/emulator with Google Play Services
5. **iOS**: Must use a **real device**, not simulator

### Invalid credentials error?
- Verify `service-account.json` matches your Firebase project
- Ensure the service account has **Cloud Messaging** permissions

### Token registration fails?
- Check that `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in the correct directories
- Run `npx cap sync` again
- Rebuild the app

---

## 🎉 You're Done!

Once you complete these steps, your app will have **fully functional push notifications** for:
- ✅ New expenses created
- ✅ Expenses updated
- ✅ Expenses deleted
- ✅ Added to a group

The system automatically handles:
- ✅ Token registration and storage
- ✅ Token cleanup (removes invalid tokens)
- ✅ Multi-device support per user
- ✅ iOS, Android, and Web compatibility
