#!/bin/bash

echo "🔍 iOS Simulator Download Monitor - $(date)"
echo "=================================================="

# Check if download process is running
if ps aux | grep "xcodebuild -downloadAllPlatforms" | grep -v grep > /dev/null; then
    echo "✅ Download process is running"
    
    # Try to get process info
    PROCESS_INFO=$(ps aux | grep "xcodebuild -downloadAllPlatforms" | grep -v grep | awk '{print "PID: " $2 ", CPU: " $3 "%, MEM: " $4 "%"}')
    echo "📊 Process: $PROCESS_INFO"
else
    echo "❌ Download process not found - likely completed!"
fi

echo ""
echo "📱 Available iOS Simulators:"
xcrun simctl list runtimes | grep iOS || echo "No iOS simulators found"

echo ""
echo "🎯 Looking for iOS 18.x runtimes..."
if xcrun simctl list runtimes | grep "iOS 18" > /dev/null; then
    echo "🎉 iOS 18.x simulator found! Ready to build."
else
    echo "⏳ Still waiting for iOS 18.x simulator..."
fi

echo "=================================================="

