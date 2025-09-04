#!/bin/bash

echo "🔍 iOS Simulator Download Monitor - $(date)"
echo "=================================================="

# Check if download process is running
PIDS=$(pgrep -f "xcodebuild -downloadAllPlatforms")
if [ -n "$PIDS" ]; then
    echo "✅ Download process is running"
    
    # Build process info for each PID
    PROCESS_INFO=""
    for PID in $PIDS; do
        if [ -n "$PROCESS_INFO" ]; then
            PROCESS_INFO="$PROCESS_INFO; "
        fi
        PID_INFO=$(ps -p "$PID" -o pid,pcpu,pmem,comm 2>/dev/null | tail -1)
        if [ $? -eq 0 ] && [ -n "$PID_INFO" ]; then
            PROCESS_INFO="$PROCESS_INFO$PID_INFO"
        fi
    done
    
    if [ -n "$PROCESS_INFO" ]; then
        echo "📊 Process: $PROCESS_INFO"
    else
        echo "📊 Process info unavailable"
    fi
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

