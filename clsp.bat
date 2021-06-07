@echo off
setlocal enabledelayedexpansion
REM Only English should be used in this file
REM echo %%0 = %0
REM echo %%1 = %1
REM echo %%2 = %2

REM argument check
if "%~1"=="" (
    echo "Usage: clsp <fileName> [push|deploy]"
    exit /b
)
REM Update scriptID if there is one argument
if "%~2"=="" (
    echo "I copied .clasp.json from the template"
    copy .clasp.json.tmpl .clasp.json
    echo "clasp setting scriptId %1.sid"
    for /f %%v in (%1.sid) do  (
        set SID=%%v
        echo !SID!
    )
    echo SID = !SID!
    cmd.exe /c clasp setting scriptId !SID!
    exit /b
)
REM If the second argument is "push", execute the "push" process.
if "%~2"=="push" (
    echo "I copied .clasp.json from the template"
    copy .clasp.json.tmpl .clasp.json
    echo "clasp setting scriptId %1.sid"
    for /f %%v in (%1.sid) do  (
        set SID=%%v
    )
    echo SID = !SID!
    cmd.exe /c clasp setting scriptId !SID!
    echo clasp push
    cmd.exe /c clasp push
    exit /b
)
REM If the second argument is "deploy", execute the "push+deploy" process.
if "%~2"=="deploy" (
    echo "I copied .clasp.json from the template"
    copy .clasp.json.tmpl .clasp.json
    echo "clasp setting scriptId %1.sid"
    for /f %%v in (%1.sid) do  (
        set SID=%%v
    )
    echo SID = !SID!
    cmd.exe /c clasp setting scriptId !SID!
    echo clasp push
    cmd.exe /c clasp push
    echo "deploy %1.did"
    for /f %%v in (%1.did) do (
        set DID=%%v
    )
    echo DID = !DID!
    cmd.exe /c clasp deploy -i !DID!
    echo "deploy deploymentId =!DID!"
    exit /b
)
echo Invalid parameter