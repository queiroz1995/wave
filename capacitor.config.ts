import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.devbot',
  appName: 'devbot',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    iosScheme: 'capacitor',
    hostname: 'localhost'
  }
};

export default config;