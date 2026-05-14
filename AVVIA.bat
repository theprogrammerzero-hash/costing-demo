@echo off
title Costing Demo
cd /d "%~dp0"
echo Avvio Costing Demo...
start "" http://localhost:3000
npm run dev
pause
