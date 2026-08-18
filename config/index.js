import { Platform } from 'react-native';
import Constants from 'expo-constants';

/*
 * When running on a real device or emulator, "localhost" refers to the device
 * itself, not your development machine.  We derive the host that Metro / Expo
 * is serving from (hostUri / debuggerHost) or fall back to the usual emulator
 * IPs so the app can still reach the API running on your laptop.
 */

const getDevHostname = () => {
  // 1. Expo Dev Client / Expo Go (SDK ≥ 44) – hostUri gives "192.168.x.x:19000"
  const hostUri = Constants?.expoConfig?.hostUri || Constants.manifest?.hostUri;
  if (hostUri) return hostUri.split(':')[0];

  // 2. Bare-React-Native with Metro – debuggerHost => "192.168.x.x:8081"
  const dbgHost = Constants.manifest?.debuggerHost;
  if (dbgHost) return dbgHost.split(':')[0];

  // 3. Android emulator default loopback to host
  if (Platform.OS === 'android') return '10.0.2.2';

  // 4. iOS simulator maps localhost correctly
  return 'localhost';
};

const DEV_HOST = getDevHostname();
const DEV_PORT = '3001';

// Inject WS_URL from environment (Expo extra or process.env) so we can override in production
const ENV_WS_URL =
  Constants?.expoConfig?.extra?.WS_URL ||
  Constants?.expoConfig?.extra?.websocketUrl || // fallback names
  process.env.EXPO_PUBLIC_WS_URL ||
  process.env.WS_URL;

// Allow overriding API base via environment / app.json so that dev builds
// running on a physical device (where the local backend isn\'t reachable)
// can still hit a remote server.
const ENV_API_URL =
  Constants?.expoConfig?.extra?.API_URL ||
  Constants?.expoConfig?.extra?.apiUrl || // fallback keys
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL;

export default {
  // Base URLs come from the environment: Expo `extra` or the
  // EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WS_URL (or API_URL / WS_URL) vars. In dev
  // we derive the Metro host so a physical device can reach the backend on your
  // laptop; in production the value must be provided by the environment.
  API_URL:
    ENV_API_URL ||
    (__DEV__ ? `http://${DEV_HOST}:${DEV_PORT}/api` : ''),

  WS_URL:
    ENV_WS_URL ||
    (__DEV__ ? `ws://${DEV_HOST}:${DEV_PORT}` : ''),
}; 