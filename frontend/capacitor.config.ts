import type { CapacitorConfig } from '@capacitor/cli'

// Store identity. appId is permanent once the app is published - change it (here,
// then `npx cap sync`) BEFORE the first upload if you want a different one.
const config: CapacitorConfig = {
  appId: 'com.infernowords.app',
  appName: 'Inferno Words',
  webDir: 'out',
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
