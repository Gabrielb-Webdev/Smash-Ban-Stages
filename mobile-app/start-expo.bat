@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
echo Iniciando Expo Go (tunnel)...
npx expo start --tunnel
pause
