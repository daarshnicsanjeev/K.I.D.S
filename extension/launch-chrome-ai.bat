@echo off
title School MCP - Chrome Gemini Nano AI Launcher
echo ======================================================================
echo   Starting Google Chrome with Gemini Nano On-Device AI Enabled...
echo ======================================================================
echo.

set "CHROME_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

echo Closing any existing background Chrome instances to apply AI flags...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 1 >nul

if "%CHROME_PATH%"=="" (
    start chrome.exe --enable-features=OptimizationGuideModelDownloading,OptimizationGuideOnDeviceModel,PromptAPIForGeminiNano --optimization-guide-on-device-model-execution-override=1
) else (
    start "" "%CHROME_PATH%" --enable-features=OptimizationGuideModelDownloading,OptimizationGuideOnDeviceModel,PromptAPIForGeminiNano --optimization-guide-on-device-model-execution-override=1
)

echo.
echo [DONE] Chrome restarted with On-Device AI flags active!
timeout /t 3 >nul
exit
