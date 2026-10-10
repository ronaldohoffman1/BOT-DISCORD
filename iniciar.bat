@echo off
chcp 65001 > nul
title Bot da Guilda - Discord
echo ===================================================
echo       INICIANDO BOT DO DISCORD DA GUILDA
echo ===================================================
echo.

node src/index.js

if %errorlevel% neq 0 (
    echo.
    echo Ocorreu um erro ao executar o bot.
    pause
)
