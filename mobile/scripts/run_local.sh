#!/usr/bin/env bash
# Run the local flavor (.env.local) on a connected device or emulator.
set -euo pipefail
cd "$(dirname "$0")/.."
flutter pub get
flutter gen-l10n
# Install for the main user only, so no duplicate app clone appears.
# Remove --device-user 0 if the phone is switched to a secondary user.
flutter run --flavor local --device-user 0 "$@"