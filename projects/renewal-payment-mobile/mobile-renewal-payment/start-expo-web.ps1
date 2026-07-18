$ErrorActionPreference = "Stop"

$codexNodeBin = "C:\Users\lenovo\AppData\Local\OpenAI\Codex\runtimes\cua_node\1b23c930bdf84ed6\bin"
$npx = Join-Path $codexNodeBin "npx.cmd"

if (-not (Test-Path $npx)) {
    throw "npx.cmd was not found at $npx. Install Node.js LTS or update this script to point to your Node runtime."
}

$env:PATH = "$codexNodeBin;$env:PATH"
& $npx expo start --web --lan --port 8081
