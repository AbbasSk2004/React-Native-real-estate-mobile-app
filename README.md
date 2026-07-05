# Eskan Real Estate Mobile App

A polished React Native application for discovering and interacting with real estate listings on the go. Built with Expo and designed to work seamlessly with the Eskan backend, this app delivers property browsing, saved listings, agent interaction, chat, notifications, and profile management in a modern mobile experience.

## Product Highlights

- Browse featured, recommended, and trending properties
- Search and filter by price, type, location, and amenities
- View detailed property information with rich media content
- Save favorites and manage personal property lists
- Submit inquiries and communicate with agents
- Manage profile details and account state
- Receive notifications and participate in chat workflows

## Tech Stack

- React Native
- Expo and Expo Router
- NativeWind / Tailwind CSS
- React Navigation
- Async Storage for local persistence
- Axios for API communication
- JWT-based authentication with the backend API
- WebSocket support for real-time messaging and updates

## Architecture Notes

- The mobile app consumes the Eskan backend through a REST API.
- Authentication is handled with JWT tokens issued by the backend.
- Persistent app data is stored in MongoDB through the backend services.
- Media assets are served and managed through Cloudinary rather than a Supabase-based storage layer.

## Project Structure

```text
real_estate/
├── app/                      # Expo Router screens and navigation
├── components/               # Reusable UI components
├── services/                 # API and integration services
├── constants/                # App-wide constants
├── utils/                    # Utility helpers
├── context/                  # React context providers
├── hooks/                    # Custom hooks
├── assets/                   # Images, fonts, and static assets
└── config/                   # Environment and app configuration
```

## Installation and Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Run on a device or simulator:
   - Press `a` for Android
   - Press `i` for iOS
   - Scan the QR code with Expo Go

## Environment Configuration

Create environment variables for the API endpoints and runtime settings as needed, for example:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

## Production Build

Use Expo EAS build for release builds:

```bash
npx eas build:configure
npm run build:android
npm run build:ios
```

## Development Notes

- Environment-specific configuration is handled through Expo environment variables.
- The app relies on the backend for authentication, property data, chat, and notifications.
- Real-time communication is supported through WebSocket integration.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

This project is licensed under the MIT License.