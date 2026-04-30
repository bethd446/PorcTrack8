import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.porc800.porctrack',
  appName: 'PorcTrack',
  // Mode Live Production — WebView pointe sur le VPS Hostinger
  server: {
    url: 'https://app.porctrack.tech/app/',
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      backgroundColor: '#2d5a1b', // Vert Forêt
      style: 'LIGHT',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#2d5a1b',
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#2d5a1b',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
