@echo off
setlocal
title ALPHA STRIKE ZERO
cd /d "%~dp0"

rem ALPHA STRIKE ZERO loads its assets from src\assets, so it has to run from a local web server.
rem This starts one for this folder and opens the game in your default browser.
rem Keep this window open while you play; close it to stop the server.

set "PORT=8780"
set "URL=http://127.0.0.1:%PORT%/index.html"

if not exist "index.html" (
  echo index.html is missing. Building it...
  call :findpy
  if defined PY ( %PY% build.py ) else ( echo Python is needed to build index.html. & pause & exit /b 1 )
)

call :findpy
echo.
echo   ALPHA STRIKE ZERO
echo   ------------------------------------------------------------
echo   Game address : %URL%
echo   Close this window to stop the game server.
echo.

rem open the browser a moment after the server starts
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" "%URL%""

if defined PY (
  %PY% -m http.server %PORT% --bind 127.0.0.1
) else (
  echo Python not found - using the built-in PowerShell server.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Port %PORT% -Root "%~dp0."
)
exit /b 0

:findpy
rem the first python on PATH that really runs Python 3 (skips the Microsoft Store stub), else the py launcher
set "PY="
for /f "delims=" %%P in ('where python 2^>nul') do (
  if not defined PY ( "%%P" -c "import sys; sys.exit(0 if sys.version_info[0]==3 else 1)" >nul 2>nul && set PY="%%P" )
)
if not defined PY ( where py >nul 2>nul && py -3 -c "print()" >nul 2>nul && set "PY=py -3" )
exit /b 0
