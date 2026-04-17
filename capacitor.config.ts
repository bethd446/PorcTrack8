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
  },
};

export default config;
