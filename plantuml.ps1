$javaExe = "java"

if ($env:JAVA_HOME) {
    $javaFromHome = Join-Path $env:JAVA_HOME "bin\java.exe"
    if (Test-Path $javaFromHome) {
        $javaExe = $javaFromHome
    }
}

if ($javaExe -eq "java") {
    $adoptiumRoot = Join-Path $env:ProgramFiles "Eclipse Adoptium"
    $adoptiumJava = Get-ChildItem -Path $adoptiumRoot -Directory -Filter "jdk-*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Select-Object -First 1 |
        ForEach-Object { Join-Path $_.FullName "bin\java.exe" }

    if ($adoptiumJava -and (Test-Path $adoptiumJava)) {
        $javaExe = $adoptiumJava
    }
}

if (-not $env:GRAPHVIZ_DOT) {
    $graphvizDot = Join-Path $env:ProgramFiles "Graphviz\bin\dot.exe"
    if (Test-Path $graphvizDot) {
        $env:GRAPHVIZ_DOT = $graphvizDot
    }
}

& $javaExe -jar (Join-Path $PSScriptRoot "plantuml.jar") @args
