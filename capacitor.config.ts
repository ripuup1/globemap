import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.voxterra.app',
  appName: 'Vox Terra',
  webDir: 'out',
  server: {
    // Use the live Vercel URL for development
    // Comment this out and use webDir for production builds
    url: 'https://nextjs-globe.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Vox Terra',
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
  },
}

export default config
