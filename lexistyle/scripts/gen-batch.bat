@echo off
title LEXI PDP BATCH
cd /d E:\cursor_HS\lexistyle

echo ============================================
echo  LEXI PDP Batch (5 items - sequential)
echo  ComfyUI processes 1 prompt at a time
echo ============================================
echo Started: %date% %time%
echo.

:: Already done: ID 20 (Women's Dress)
:: Generate remaining 4

call :gen_one 29 "Long-sleeved Chiffon Dress"
call :gen_one 61 "Bikini One-piece Swimsuit"
call :gen_one 100 "Satin Button-Up Blouse"
call :gen_one 1275 "American-style Round-neck"

echo.
echo ============================================
echo  ALL DONE at %date% %time%
echo ============================================
pause
goto :eof

:gen_one
setlocal
set ID=%1
set NAME=%~2
echo.
echo ============================================
echo [%ID%] %NAME% -- %date% %time%
echo ============================================
npx tsx scripts/gen-sample3-mock.ts --catalogId=%ID%
if %ERRORLEVEL% EQU 0 (
    echo [OK] %ID% completed
) else (
    echo [WARN] %ID% failed (exit=%ERRORLEVEL%)
)
endlocal
goto :eof