@echo off
echo Starting LIQUID Hotspot System...
echo.

echo Starting Backend Server...
start "LIQUID Backend" cmd /k "cd backend && npm start"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend...
start "LIQUID Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo LIQUID Hotspot System is starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit this window...
pause > nul 