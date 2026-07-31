@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0projects\tl-smart"
if not exist node_modules (
  echo Installing TL Smart dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
call npm run web
