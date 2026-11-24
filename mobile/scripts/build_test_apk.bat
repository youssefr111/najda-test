@echo off
cd /d "%~dp0\.."
call flutter pub get || exit /b 1
call flutter gen-l10n || exit /b 1
call flutter build apk --release --flavor qa || exit /b 1
echo.
echo APK: build\app\outputs\flutter-apk\app-qa-release.apk
