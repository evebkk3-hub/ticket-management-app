@echo off
setlocal

set "JAVA_EXE=java"
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" (
  set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
)

if "%JAVA_EXE%"=="java" (
  for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-*") do (
    if exist "%%~fD\bin\java.exe" set "JAVA_EXE=%%~fD\bin\java.exe"
  )
)

if not defined GRAPHVIZ_DOT if exist "%ProgramFiles%\Graphviz\bin\dot.exe" (
  set "GRAPHVIZ_DOT=%ProgramFiles%\Graphviz\bin\dot.exe"
)

"%JAVA_EXE%" -jar "%~dp0plantuml.jar" %*
