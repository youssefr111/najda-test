#!/usr/bin/env bash
# Run the local flavor (env/.env.local) on a connected device or emulator.
set -euo pipefail
cd "$(dirname "$0")/.."
flutter pub get
flutter gen-l10n
flutter run --flavor local "$@"
