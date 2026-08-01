@echo off
title Obs Trivia game
cd /d "%~dp0"
echo Starting Obs Trivia game (Node)...
echo For the desktop app, use: npm run electron:dev  or  the Windows installer from npm run dist:win
echo.
call node dist\main.js
pause
