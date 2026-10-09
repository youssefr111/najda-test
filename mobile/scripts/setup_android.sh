#!/usr/bin/env bash
# One-time: generate the Android project and layer the flavors/signing on top.
# The generated build.gradle.kts is kept (we only append to it), so this keeps
# working when Flutter changes its Gradle template.
set -euo pipefail
cd "$(dirname "$0")/.."

flutter create --platforms=android --org com.najda --project-name najda .

# Flavors + signing live in a separate script applied from the stock build file.
cp android_overlay/app/najda-flavors.gradle.kts android/app/
grep -q 'najda-flavors.gradle.kts' android/app/build.gradle.kts \
  || printf '\napply(from = "najda-flavors.gradle.kts")\n' >> android/app/build.gradle.kts

# Per-flavor manifests (plain-http backend allowed for local/qa only).
cp -R android_overlay/app/src/local android_overlay/app/src/qa android/app/src/

# Main manifest: per-flavor app label + the permissions the app needs.
MANIFEST=android/app/src/main/AndroidManifest.xml
sed -i 's|android:label="[^"]*"|android:label="@string/app_name"|' "$MANIFEST"
grep -q ACCESS_FINE_LOCATION "$MANIFEST" || sed -i 's|<application|<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n    <application|' "$MANIFEST"

echo "Android platform ready. Fill env/.env.local, then run ./scripts/run_local.sh"
