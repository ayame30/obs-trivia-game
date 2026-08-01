@echo off
title Stream Trivia

cd /d "%~dp0"

echo Starting Stream Trivia...
call node dist/main.js
pause