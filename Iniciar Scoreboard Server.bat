@echo off
title Servidor Scoreboard — Santa Fe Smash
color 0A
echo.
echo  Iniciando servidor Scoreboard...
echo  Deja esta ventana abierta mientras transmitis.
echo.
cd /d "%~dp0"
node scoreboard-server.js
echo.
echo  El servidor se detuvo.
pause
