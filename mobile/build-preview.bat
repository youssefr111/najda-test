@echo off
setlocal enabledelayedexpansion
set APP_VARIANT=
set APK_SRC=android\app\build\outputs\apk\release\app-release.apk
set APK_DST=najda-latest.apk

echo ============================================
echo  Building PREVIEW APK
echo ============================================

call npx expo prebuild --clean
if errorlevel 1 (
    echo [FAILED] expo prebuild step failed.
    pause
    exit /b 1
)

cd android
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo [FAILED] Gradle build failed.
    cd ..
    pause
    exit /b 1
)
cd ..

if not exist "%APK_SRC%" (
    echo [FAILED] Build reported success but APK not found at:
    echo   %APK_SRC%
    pause
    exit /b 1
)

for %%A in ("%APK_SRC%") do set APK_SIZE=%%~zA
if %APK_SIZE% LSS 1000000 (
    echo [FAILED] APK looks too small ^(%APK_SIZE% bytes^) - likely corrupted or incomplete.
    pause
    exit /b 1
)

move /Y "%APK_SRC%" "%APK_DST%" >nul
if errorlevel 1 (
    echo [FAILED] Move to %APK_DST% failed.
    pause
    exit /b 1
)

if not exist "%APK_DST%" (
    echo [FAILED] Move reported success but %APK_DST% is missing.
    pause
    exit /b 1
)

for %%A in ("%APK_DST%") do set DST_SIZE=%%~zA
if not "!DST_SIZE!"=="%APK_SIZE%" (
    echo [FAILED] Moved file size mismatch - file may be corrupted.
    echo   Expected: %APK_SIZE% bytes   Got: !DST_SIZE! bytes
    pause
    exit /b 1
)

echo ============================================
echo  [SUCCESS] %APK_DST% built and moved OK
echo  Size: %APK_SIZE% bytes
echo ============================================
pause
exit /b 0