@echo off
title Local RAG System Launcher
echo ==============================================
echo        Local RAG AI Assistant
echo ==============================================
echo.

echo 1. Launching Backend Server (FastAPI) in a new window...
start "RAG Backend - FastAPI" cmd /k "echo FastAPI Server is running... && .venv\Scripts\uvicorn backend.main:app --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo 2. Opening chat page in browser...
start http://localhost:5173

echo ==============================================
echo [SUCCESS] Local RAG AI System Started!
echo.
echo  * Backend Address: http://localhost:8000
echo  * Frontend Address: http://localhost:5173
echo  * API Documentation: http://localhost:8000/docs
echo.
echo  To close the application, you can close this
echo  window and the other active terminal window.
echo ==============================================
echo.

echo 3. Launching Frontend (React) in this window...
cd frontend
npm run dev
