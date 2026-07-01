@echo off
setlocal
chcp 65001 >nul

if not exist out mkdir out
if not exist data mkdir data
javac -encoding UTF-8 -d out src\main\java\com\example\ticket\*.java
if errorlevel 1 exit /b %errorlevel%

java -Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8 -cp "out;lib\sqlite-jdbc.jar" com.example.ticket.WebMain
