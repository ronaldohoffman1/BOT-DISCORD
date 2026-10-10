@echo off
chcp 65001 > nul
title Registrar Comandos Slash
echo ===================================================
echo     REGISTRANDO COMANDOS SLASH NO DISCORD
echo ===================================================
echo.

node src/deploy-commands.js

echo.
pause
