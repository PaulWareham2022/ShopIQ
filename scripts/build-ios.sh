#!/bin/bash
set -e

echo "Running iOS build script..."

# Navigate to iOS directory and run pod install
cd ios
echo "Running pod install from ios directory..."
pod install
cd ..

echo "iOS build script completed successfully"
