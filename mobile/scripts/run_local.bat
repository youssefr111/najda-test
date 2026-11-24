@echo off
cd /d "%~dp0\.."
call flutter pub get || exit /b 1
call flutter gen-l10n || exit /b 1
rem Install for the main user only, so no duplicate app clone appears.
rem Remove --device-user 0 if the phone is switched to a secondary user.
call flutter run --flavor local --device-user 0 %*