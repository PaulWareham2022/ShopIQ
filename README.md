# ShopIQ - Smart Household Price Comparison App

A React Native app built with Expo for finding the best deals across suppliers for household items.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or later) - ✅ Installed
- **npm** - ✅ Installed  
- **Xcode** (for iOS development) - ✅ Installed
- **Expo CLI** - ✅ Installed globally
- **iOS Simulator** - ✅ Available

### One-Time Setup

```bash
# Install dependencies and iOS pods
npm run setup

# Or manually:
npm install
cd ios && pod install && cd ..
```

### Development Workflow

#### Start Development Server
```bash
# Start Expo development server
npm start

# Or start directly with iOS simulator
npm run start:ios

# For development client (recommended for native modules)
npm run dev:ios
```

#### Run on iOS Simulator
```bash
# Build and run on iOS simulator
npm run ios:simulator

# Or use Expo CLI directly
expo run:ios --simulator
```

#### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run start:ios` | Start with iOS simulator |
| `npm run dev:ios` | Start with dev client for iOS |
| `npm run ios:simulator` | Build and run on iOS simulator |
| `npm run setup` | Install dependencies and pods |
| `npm run clean` | Clear Expo cache |
| `npm run clean:ios` | Clean iOS build cache |

## 📱 iOS Development

### Simulator Setup
- **iPhone 15** simulator is currently booted and ready
- Available simulators: iPhone 15 Pro, iPhone 15 Pro Max, iPhone 16 series
- Bundle identifier: `com.shopiq.app`
- iOS deployment target: 17.0

### Real-time Development
1. Start the development server: `npm run dev:ios`
2. The app will automatically reload when you make changes
3. Use Expo Dev Tools for debugging and performance monitoring
4. Hot reloading is enabled by default

### Native Modules
This project uses:
- **expo-sqlite** - Local database storage
- **react-native-mmkv** - Fast key-value storage
- **expo-dev-client** - Development client for native modules

## 🏗️ Project Structure

```
ShopIQ/
├── app/                    # Expo Router app directory
│   ├── inventory/         # Inventory management screens
│   ├── suppliers/         # Supplier management screens
│   └── offers.tsx         # Offers listing
├── src/
│   ├── components/        # Reusable UI components
│   ├── storage/          # Data layer (SQLite, MMKV)
│   └── constants/        # App constants
├── ios/                  # iOS native code
├── e2e/                  # End-to-end tests
└── assets/               # Images and icons
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e:ios
```

## 🔧 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npm run clean
npm start
```

**iOS build issues:**
```bash
npm run clean:ios
cd ios && pod install && cd ..
npm run ios:simulator
```

**Pod installation issues:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Simulator not found:**
```bash
# List available simulators
xcrun simctl list devices available

# Boot a specific simulator
xcrun simctl boot "iPhone 15 Pro"
```

### Development Tips

1. **Use the development client** (`npm run dev:ios`) for better native module support
2. **Enable Fast Refresh** in the Expo Dev Tools for instant updates
3. **Use the iOS Simulator** for consistent testing environment
4. **Check the Metro bundler logs** for any build issues

## 📦 Dependencies

### Core
- **Expo SDK 53** - Latest stable version
- **React Native 0.79.5** - With new architecture enabled
- **React 19.0.0** - Latest React version

### Key Libraries
- **expo-router** - File-based routing
- **expo-sqlite** - Local database
- **react-native-mmkv** - Fast storage
- **formik** - Form handling
- **zod** - Schema validation

## 🎯 Development Environment

This setup provides:
- ✅ Real-time code reloading
- ✅ iOS simulator integration
- ✅ Native module support
- ✅ TypeScript support
- ✅ ESLint and Prettier
- ✅ Jest testing
- ✅ E2E testing with Maestro

## 📞 Support

For development issues:
1. Check the troubleshooting section above
2. Review Expo documentation: https://docs.expo.dev/
3. Check React Native documentation: https://reactnative.dev/

---

**Happy coding! 🚀**
