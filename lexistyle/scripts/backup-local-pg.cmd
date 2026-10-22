@echo off
REM ============================================================
REM  LEXI local PostgreSQL 18 daily backup (Windows)
REM  - Runs via Windows Task Scheduler (see schedule note below)
REM  - Backs up lexi + g6_db to ~\.lexi-local\backups
REM  - Keeps last 14 backups, logs to backup.log
REM ============================================================
setlocal

set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "CRED_FILE=%USERPROFILE%\.lexi-local\data\pg-local-credentials.txt"
set "BK_DIR=%USERPROFILE%\.lexi-local\backups"
set "MIRROR_DIR=E:\user\.lexi-local\backups"
set "LOG=%USERPROFILE%\.lexi-local\backups\backup.log"

if not exist "%BK_DIR%" mkdir "%BK_DIR%"
if not exist "%MIRROR_DIR%" mkdir "%MIRROR_DIR%"

REM ---- load password for system user 'postgres' from credentials file ----
set "PGPASSWORD="
for /f "usebackq tokens=1,* delims==" %%A in ("%CRED_FILE%") do (
  if "%%A"=="postgres" set "PGPASSWORD=%%B"
)
if "%PGPASSWORD%"=="" (
  echo [%date% %time%] ERROR: postgres password not found in %CRED_FILE% >> "%LOG%"
  exit /b 1
)

set "TS=%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%"
set "TS=%TS: =0%"
set "FAILED=0"

for %%D in (lexi g6_db) do (
  "%PG_BIN%\pg_dump.exe" -h 127.0.0.1 -U postgres -d %%D -Fc -f "%BK_DIR%\%%D-%TS%.dump" 2>>"%LOG%"
  if errorlevel 1 (
    echo [%date% %time%] FAIL %%D dump >> "%LOG%"
    set "FAILED=1"
  ) else (
    echo [%date% %time%] OK   %%D -> %BK_DIR%\%%D-%TS%.dump >> "%LOG%"
    copy /y "%BK_DIR%\%%D-%TS%.dump" "%MIRROR_DIR%\%%D-%TS%.dump" >nul
    if errorlevel 1 (
      echo [%date% %time%] FAIL %%D mirror -> %MIRROR_DIR% >> "%LOG%"
      set "FAILED=1"
    ) else (
      echo [%date% %time%] OK   %%D mirror -> %MIRROR_DIR%\%%D-%TS%.dump >> "%LOG%"
    )
  )
)

REM ---- rotate: keep newest 14 per db ----
for %%D in (lexi g6_db) do (
  for /f "skip=14 delims=" %%F in ('dir /b /o-d "%BK_DIR%\%%D-*.dump" 2^>nul') do (
    del "%BK_DIR%\%%F"
    echo [%date% %time%] prune %%F >> "%LOG%"
  )
  for /f "skip=14 delims=" %%F in ('dir /b /o-d "%MIRROR_DIR%\%%D-*.dump" 2^>nul') do (
    del "%MIRROR_DIR%\%%F"
    echo [%date% %time%] prune mirror %%F >> "%LOG%"
  )
)

echo [%date% %time%] DONE >> "%LOG%"
if not "%FAILED%"=="0" exit /b 1
endlocal
