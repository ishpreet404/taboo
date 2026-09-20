import type { CapacitorConfig } from '@capacitor/cli'

// Store identity. appId is permanent once the app is published - change it (here,
// then `npx cap sync`) BEFORE the first upload if you want a different one.
const config: CapacitorConfig = {
  appId: 'com.dontsayit.app',
  appName: "Don't Say it!",
  webDir: 'out',
  // The UI is laid out 1:1 for the screen; pinch/double-tap zoom only breaks it
  zoomEnabled: false,
  android: {
    // https://localhost origin: secure context for WebRTC + storage
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
