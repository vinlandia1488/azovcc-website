@echo off
setlocal enabledelayedexpansion
:: check for admin privileges (required for registry modification)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] error: this research tool requires administrator privileges.
    pause
    exit
)

:main
cls
color 0b
echo  ^|----------------------------------------------------------^|
echo  ^|  active system identity research tool                    ^|
echo  ^|----------------------------------------------------------^|
echo.

:: 1. analyze current state
for /f "tokens=3" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Cryptography" /v MachineGuid') do set current_guid=%%a
echo  [+] current registry hwid: !current_guid!
echo.
echo  ------------------------------------------------------------
echo  [ active research options ]
echo  1. apply new random machineguid (active spoof)
echo  2. restore backup (if available)
echo  3. exit
echo  ------------------------------------------------------------
echo.
set /p choice=" > select research action: "

if "%choice%"=="1" goto apply_spoof
if "%choice%"=="2" goto restore_backup
if "%choice%"=="3" exit
goto main

:apply_spoof
:: backup current guid to a local file for research safety
echo !current_guid! > "%~dp0guid_backup.txt"

:: generate a randomized guid structure
set "hex=0123456789abcdef"
set "new_guid="
for /l %%i in (1,1,8) do (set /a "r=!random!%%16" & for %%j in (!r!) do set "new_guid=!new_guid!!hex:~%%j,1!")
set "new_guid=!new_guid!-"
for /l %%i in (1,1,4) do (set /a "r=!random!%%16" & for %%j in (!r!) do set "new_guid=!new_guid!!hex:~%%j,1!")
set "new_guid=!new_guid!-4e2b-8a1c-"
for /l %%i in (1,1,12) do (set /a "r=!random!%%16" & for %%j in (!r!) do set "new_guid=!new_guid!!hex:~%%j,1!")

:: modify the registry
reg add "HKLM\SOFTWARE\Microsoft\Cryptography" /v MachineGuid /t REG_SZ /d !new_guid! /f >nul

echo.
echo  [!] registry modification complete.
echo  [+] new machineguid applied: !new_guid!
echo  [+] backup saved to guid_backup.txt
echo.
echo  note: some applications may require a system restart 
echo        to detect the new hardware identity environment.
echo.
pause
goto main

:restore_backup
if not exist "%~dp0guid_backup.txt" (
    echo [!] no backup file found in directory.
    pause
    goto main
)
set /p backup_id=<"%~dp0guid_backup.txt"
reg add "HKLM\SOFTWARE\Microsoft\Cryptography" /v MachineGuid /t REG_SZ /d !backup_id! /f >nul
echo [+] native machineguid restored: !backup_id!
pause
goto main
