@echo off
REM NexChat Quick Start Script for Windows

echo.
echo ============================================================
echo 🚀 NexChat - Quick Start Setup
echo ============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo    Please install Node.js ^>= 18.0.0 from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js version: %NODE_VERSION%
echo ✅ npm version: %NPM_VERSION%
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Type check
echo 🔍 Type checking...
call npm run type-check
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Type check warnings found (non-blocking)
)
echo ✅ Type check complete
echo.

REM Build
echo 🔨 Building project...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✅ Build successful
echo.

echo ============================================================
echo ✅ Setup complete!
echo ============================================================
echo.
echo To start developing:
echo    npm run dev
echo.
echo Then open:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3000
echo.
echo To test locally:
echo    1. Open http://localhost:5173 in two tabs
echo    2. Use the same key in both tabs
echo    3. Set different nicknames
echo    4. Start chatting!
echo.
echo To build for production:
echo    npm run build
echo.
echo Happy coding! 🎉
echo.
pause
