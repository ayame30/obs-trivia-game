@echo off
title Stream Trivia

cd /d "%~dp0"

echo Starting Stream Trivia...
call npx tsx src/index.ts
pause