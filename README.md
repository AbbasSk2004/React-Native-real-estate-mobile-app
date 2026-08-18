# ESKAN Real Estate — Mobile App

A React Native application for discovering and interacting with ESKAN real estate listings on the go. Built with **Expo SDK 53** (React Native 0.79) and **Expo Router** (file-based routing), styled with **NativeWind** (Tailwind for React Native). It consumes the Express + MongoDB backend (`../backend`) for property browsing, favorites, chat, notifications, agent workflows, and profile management.

## Project Repositories

ESKAN is split across four repositories that all share the single backend API and one MongoDB database.

| Component | Repository | Local directory | Stack |
|---|---|---|---|
| Backend API | [eskan-real-estate-backend](https://github.com/AbbasSk2004/eskan-real-estate-backend) | `backend/` | Node.js, Express 4, MongoDB (Mongoose 7) |
| Web platform | [Eskan_Real_Estate_Web](https://github.com/AbbasSk2004/Eskan_Real_Estate_Web) | `real-estate-react/` | Next.js 14 (App Router), React 18 |
| Admin panel | [react-real-estate-admin-panel](https://github.com/AbbasSk2004/react-real-estate-admin-panel) | `admin-panel/` | React 18, MUI 5, Chart.js |
| **Mobile app** &nbsp;`you are here` | [React-Native-real-estate-mobile-app](https://github.com/AbbasSk2004/React-Native-real-estate-mobile-app) | `real_estate/` | Expo SDK 53, React Native 0.79 |

Clone them as **siblings in one parent directory** so the relative paths used throughout these docs (`../backend`, `../real-estate-react`) resolve:

```bash
mkdir eskan && cd eskan
git clone https://github.com/AbbasSk2004/eskan-real-estate-backend.git backend
git clone https://github.com/AbbasSk2004/Eskan_Real_Estate_Web.git real-estate-react
git clone https://github.com/AbbasSk2004/react-real-estate-admin-panel.git admin-panel
git clone https://github.com/AbbasSk2004/React-Native-real-estate-mobile-app.git real_estate
```

All three clients authenticate against the same `/api/auth` endpoints and read the same property data, so **a change to any backend response shape affects all three**. The property payload in particular is served in both camelCase and snake_case (see `toResponse` in `backend/services/property.service.js`) specifically to keep older mobile and web clients working — do not remove alias fields without checking every client.

## Product Highlights

- Browse home, explore, featured, and trending properties
- Search and filter by price, type, location, and amenities
- Detailed property pages with rich media, similar properties, and owner sections
- Save favorites, submit inquiries, send contact messages
- Agent application and "my properties" workflows
- 1:1 chat and real-time notifications (socket + SSE)
- Profile management, change password, payment methods, legal pages (privacy/terms)
- Network-info and connection debugging screens

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Expo SDK 53, React Native 0.79, React 19 |
| Navigation | Expo Router (`app/` file-based routing, tab group `app/(tabs)/`) |
| Styling | NativeWind 4 (Tailwind) via `global.css` + Babel/Metro plugins |
| State | React Context (`Auth`, `Chat`, `Notifications`, `Properties`, `Database`, `Theme`) |
| HTTP/Realtime | Axios; WebSocket client (`REACT_APP_WS_URL`-style `/ws`) + SSE notifications |
| Storage | `@react-native-async-storage/async-storage` |
| Device | expo-notifications, expo-image-picker, expo-document-picker, expo-network, expo-haptics, expo-blur |
| Build | EAS (`eas.json`) with embedded bare Android project (`android/`) |

## Project Structure

```text
real_estate/
├── app/                      # Expo Router screens (file-based)
│   ├── _layout.js            # Root layout
│   ├── index.js              # Entry route
│   ├── (tabs)/               # Tab group: index (home), explore, agents, profile
│   └── ...                   # 27 standalone screens: propertyDetails, search, chat,
│                             #   chats, notifications, sign-in, sign-up, verify-otp,
│                             #   add-property, my-properties, saved-properties, faqs,
│                             #   contact, edit-profile, change-password, paymentform,
│                             #   payment-methods, terms, privacy, featured, agent-application,
│                             #   verification-success, network-info, forgot-password
├── components/               # Reusable UI (common/, properties/, plus root-level widgets)
├── services/                 # API clients (api, auth, propertyService, chat.service,
│                             #   notificationService, websocket, recommendation, ...)
├── context/                  # AuthContext, ChatContext, NotificationContext, ...
├── hooks/                    # useAuth, useChat, useFavorites, useNotifications, ...
├── constants/                # colors, theme, icons, images, data
├── config/                   # index.js (API/WS URL resolution), constants.js
├── utils/                    # 16 helpers (authStorage, environment, formatters, ...)
├── assets/                   # fonts, icons, splash
├── scripts/                  # set-env.js (env switching)
├── screens/                  # LEGACY (AddPropertyScreen.js) — superseded by app/ router
├── PropertyDetail.js         # LEGACY root component — superseded by app/propertyDetails.js
├── App.js                    # LEGACY entry — replaced by index.js → expo-router/entry
├── index.js                  # Entry: loads utils/environment then expo-router/entry
├── app.json                  # Expo config (scheme `realestate`, deep links, EAS project)
├── eas.json                  # EAS build profiles (preview + production, APK)
├── metro.config.js           # Expo Metro + NativeWind (Hercules/hermes-stable)
├── babel.config.js           # babel-preset-expo + expo-router + react-native-dotenv
├── tailwind.config.js
└── global.css                # NativeWind stylesheet entry
```

> `screens/`, `App.js`, and `PropertyDetail.js` are **legacy leftovers**. The active entry point is `index.js` → `expo-router/entry`, which routes through `app/`.

## API & WebSocket Configuration

Base URLs are resolved in `config/index.js` with this priority:

1. **Expo extra:** `app.json` → `extra.API_URL` / `extra.WS_URL`
2. **Env vars:** `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WS_URL` (or `API_URL`/`WS_URL`)
3. **Fallbacks:**
   - Development: `http://<metro-host>:3001/api` (host derived from Expo `hostUri`/`debuggerHost`; `10.0.2.2` on Android emulators)
   - Production: value from `app.json` extra / env (set per deployment; not published here)

## Environment Configuration

The app reads environment via **react-native-dotenv** (Babel): `.env` in development, `.env.production` when `NODE_ENV=production` (native prebuild / EAS).

Key variable names (values depend on your deployment):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` / `API_BASE_URL` | REST API base URL |
| `EXPO_PUBLIC_WS_URL` / `WS_URL` | WebSocket server URL |
| `GOOGLE_MAPS_API_KEY`, `GOOGLE_CLIENT_ID` | Maps / Google integration |
| `FIREBASE_*` | Firebase config (verify current usage before relying on it) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Legacy Supabase values (backend now uses MongoDB) |
| `BACKEND_PORT`, `METRO_BUNDLER_PORT`, `EXPO_URL` | Ports used by dev tooling |

### Switching environments

```bash
node scripts/set-env.js production   # copies .env.production → .env (for EAS/prod builds)
node scripts/set-env.js development  # back to the dev .env
```

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Expo development server:

   ```bash
   npm start
   ```

3. Run on a device/simulator:
   - Press `a` for Android (Expo Go / dev build)
   - Press `i` for iOS
   - Scan the QR code with Expo Go
   - NativeAndroid: `npm run android` / `npm run ios` (requires the `android/` prebuild)

> A physical device cannot reach `localhost` on your laptop; the app derives the Metro host automatically (see `config/index.js`), or set `EXPO_PUBLIC_API_URL` / `WS_URL` to your machine's LAN IP or a remote backend.

## Development Scripts

| Command | Description |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run android` / `ios` | Run native dev build |
| `npm run web` | Run web target |
| `npm run android:prod` / `ios:prod` | Native build with `EXPO_PUBLIC_ENV=production` |
| `npm run prebuild:android` / `prebuild:ios` | Regenerate native projects (`--clean`) |
| `npm run build:android` / `build:ios` | EAS cloud build (production env) |

## Production Builds (EAS)

`eas.json` defines `preview` and `production` profiles (both Android `apk`):

```bash
npx eas login
npx eas build:configure        # links the EAS project ID (see app.json extra.eas.projectId)
npm run build:android          # production APK via EAS
```

`app.json` includes iOS/Android bundle identifiers (`com.abbas.realestate`), Android intent filters, and iOS associated domains for deep links (`/auth`, Supabase verify) on the production backend (the associated-domain host is configured in `app.json` and not published here).

## Testing

No test runner is configured for this app yet. `jest` transformIgnorePatterns are preset in `package.json` for future use.

## License

MIT