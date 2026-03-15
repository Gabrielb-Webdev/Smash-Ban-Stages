@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
echo Iniciando Expo Go (tunnel, limpiando cache)...
npx expo start --tunnel --clear
pause
