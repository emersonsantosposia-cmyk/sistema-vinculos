@echo off
setlocal EnableExtensions
set "URL=http://localhost:3000/login"
pushd "%~dp0.." || exit /b 0
set "ROOT=%CD%"

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if not errorlevel 1 goto open_browser

start "next-dev" /MIN cmd /d /c "cd /d %ROOT% && npm run dev"

set /a _i=0
:wait_port
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if not errorlevel 1 goto open_browser
set /a _i+=1
if %_i% GEQ 60 goto open_browser
timeout /t 1 /nobreak >nul
goto wait_port

:open_browser
start "" "%URL%"
popd
exit /b 0
