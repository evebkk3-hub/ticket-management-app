param(
    [string]$SourceRoot = "C:\Users\lenovo\Downloads",
    [string]$OutputDirectory = "tmp\downloads-memory-audit\documents"
)

$ErrorActionPreference = "Stop"

function Safe-FileName {
    param([string]$Value)
    $safe = $Value
    foreach ($character in [IO.Path]::GetInvalidFileNameChars()) {
        $safe = $safe.Replace([string]$character, "_")
    }
    if ($safe.Length -gt 150) {
        $safe = $safe.Substring(0, 150)
    }
    return $safe
}

$root = (Resolve-Path -LiteralPath $SourceRoot).Path
if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}
$outputRoot = (Resolve-Path -LiteralPath $OutputDirectory).Path
$files = Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object { $_.Extension.ToLowerInvariant() -in @(".docx", ".doc", ".pdf") } |
    Sort-Object FullName

$word = $null
$results = New-Object System.Collections.Generic.List[object]
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $index = 0
    foreach ($file in $files) {
        $index++
        $relativePath = $file.FullName.Substring($root.Length + 1)
        Write-Output "START`t$index`t$($files.Count)`t$relativePath"
        $document = $null
        $startedAt = Get-Date
        try {
            $document = $word.Documents.Open($file.FullName, $false, $true)
            $text = $document.Content.Text
            $pages = $document.ComputeStatistics(2)
            $words = $document.ComputeStatistics(0)
            $paragraphs = $document.Paragraphs.Count
            $tables = $document.Tables.Count
            $inlineShapes = $document.InlineShapes.Count
            $shapes = $document.Shapes.Count
            $headings = New-Object System.Collections.Generic.List[string]
            foreach ($paragraph in $document.Paragraphs) {
                if ($headings.Count -ge 250) {
                    break
                }
                $styleName = ""
                try {
                    $styleName = [string]$paragraph.Range.Style.NameLocal
                }
                catch {
                    $styleName = ""
                }
                if ($styleName -match "Heading|หัวเรื่อง|Title|ชื่อเรื่อง") {
                    $headingText = $paragraph.Range.Text.Trim()
                    if (-not [string]::IsNullOrWhiteSpace($headingText)) {
                        $headings.Add($headingText.Substring(0, [Math]::Min(500, $headingText.Length)))
                    }
                }
            }
            $payload = [ordered]@{
                path = $relativePath
                extension = $file.Extension.ToLowerInvariant()
                bytes = $file.Length
                modified = $file.LastWriteTime.ToString("s")
                status = "read"
                pages = $pages
                words = $words
                paragraphs = $paragraphs
                tables = $tables
                inlineShapes = $inlineShapes
                shapes = $shapes
                headings = $headings
                textLength = $text.Length
                text = $text
                elapsedSeconds = [Math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
            }
            $outputName = "{0:D3}-{1}.json" -f $index, (Safe-FileName -Value $file.BaseName)
            $payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outputRoot $outputName) -Encoding UTF8
            $results.Add([ordered]@{
                path = $relativePath
                status = "read"
                pages = $pages
                words = $words
                textLength = $text.Length
                output = $outputName
                elapsedSeconds = $payload.elapsedSeconds
            })
            Write-Output "DONE`t$index`t$pages`t$words`t$($payload.elapsedSeconds)`t$relativePath"
        }
        catch {
            $errorPayload = [ordered]@{
                path = $relativePath
                extension = $file.Extension.ToLowerInvariant()
                bytes = $file.Length
                modified = $file.LastWriteTime.ToString("s")
                status = "error"
                error = $_.Exception.Message
                elapsedSeconds = [Math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
            }
            $outputName = "{0:D3}-{1}-ERROR.json" -f $index, (Safe-FileName -Value $file.BaseName)
            $errorPayload | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputRoot $outputName) -Encoding UTF8
            $results.Add([ordered]@{
                path = $relativePath
                status = "error"
                error = $_.Exception.Message
                output = $outputName
                elapsedSeconds = $errorPayload.elapsedSeconds
            })
            Write-Output "ERROR`t$index`t$($errorPayload.elapsedSeconds)`t$relativePath`t$($_.Exception.Message)"
        }
        finally {
            if ($null -ne $document) {
                $document.Close(0)
                [Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
            }
            [GC]::Collect()
            [GC]::WaitForPendingFinalizers()
        }
    }
}
finally {
    if ($null -ne $word) {
        $word.Quit()
        [Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString("s")
    sourceRoot = $root
    documentCount = $files.Count
    documentsRead = @($results | Where-Object status -eq "read").Count
    documentErrors = @($results | Where-Object status -eq "error").Count
    totalPages = (($results | Where-Object status -eq "read") | Measure-Object pages -Sum).Sum
    totalWords = (($results | Where-Object status -eq "read") | Measure-Object words -Sum).Sum
    documents = $results
}
$summaryPath = Join-Path $outputRoot "_summary.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $summaryPath -Encoding UTF8
Write-Output "SUMMARY`t$summaryPath`t$($summary.documentsRead)`t$($summary.documentErrors)`t$($summary.totalPages)`t$($summary.totalWords)"
