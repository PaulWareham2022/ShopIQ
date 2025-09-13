#!/bin/bash
set -e

echo "Starting EAS build script..."

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Verify iOS directory exists
if [ ! -d "ios" ]; then
    echo "iOS directory not found, running prebuild..."
    npx expo prebuild --platform ios
fi

# Verify Podfile exists
if [ ! -f "ios/Podfile" ]; then
    echo "Podfile not found, this is an error!"
    exit 1
fi

echo "iOS directory and Podfile verified successfully"
echo "Build script completed"
