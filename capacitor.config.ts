import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wiselyspent.app',
  appName: 'Wisely Spent',
  webDir: 'dist',
  // Uncomment for development with live reload:
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:5173',
  //   cleartext: true
  // },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#3b82f6",
      showSpinner: false
    },
    Geolocation: {
      // Configured via platform-specific permissions
    }
  }
};

export default config;
