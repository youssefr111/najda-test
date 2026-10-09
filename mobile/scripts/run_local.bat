@echo off
cd /d "%~dp0\.."
call flutter pub get || exit /b 1
call flutter gen-l10n || exit /b 1
call flutter run --flavor local %*
