import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.porc800.porctrack',
  appName: 'PorcTrack',
  // On passe en mode Live Production (on pointe sur le VPS)
  server: {
    url: 'https://app.porctrack.tech',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      backgroundColor: '#064e3b', // Couleur Émeraude-Premium
      style: 'LIGHT',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#064e3b',
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#064e3b",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
