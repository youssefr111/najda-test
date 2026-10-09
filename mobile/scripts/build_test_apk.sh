#!/usr/bin/env bash
# Your own test APK (env/.env.test, package com.najda.mobile.test). Never published.
set -euo pipefail
cd "$(dirname "$0")/.."
flutter pub get
flutter gen-l10n
flutter build apk --release --flavor qa
echo
echo "APK: build/app/outputs/flutter-apk/app-qa-release.apk"
