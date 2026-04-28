import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.porc800.porctrack',
  appName: 'PorcTrack',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      backgroundColor: '#FAFAF7',
      style: 'LIGHT',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#064e3b',
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
