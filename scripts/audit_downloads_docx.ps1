param(
    [string]$SourceRoot = "C:\Users\lenovo\Downloads",
    [string]$OutputDirectory = "tmp\downloads-memory-audit\docx"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Safe-FileName {
    param([string]$Value)
    $safe = $Value
    foreach ($character in [IO.Path]::GetInvalidFileNameChars()) {
        $safe = $safe.Replace([string]$character, "_")
    }
    return $safe.Substring(0, [Math]::Min(150, $safe.Length))
}

function Read-EntryXml {
    param(
        [System.IO.Compression.ZipArchiveEntry]$Entry
    )
    $stream = $Entry.Open()
    $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8, $true)
    try {
        return [xml]$reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
        $stream.Dispose()
    }
}

function Get-PartText {
    param(
        [xml]$Xml,
        [bool]$IncludeParagraphDetails
    )
    $paragraphs = New-Object System.Collections.Generic.List[object]
    $textBlocks = New-Object System.Collections.Generic.List[string]
    foreach ($paragraph in $Xml.SelectNodes("//*[local-name()='p']")) {
        $parts = $paragraph.SelectNodes(".//*[local-name()='t' or local-name()='delText' or local-name()='instrText']") |
            ForEach-Object { $_.InnerText }
        $text = ($parts -join "").Trim()
        if (-not [string]::IsNullOrWhiteSpace($text)) {
            $textBlocks.Add($text)
            if ($IncludeParagraphDetails) {
                $styleNode = $paragraph.SelectSingleNode("./*[local-name()='pPr']/*[local-name()='pStyle']")
                $style = $(if ($null -ne $styleNode) { $styleNode.GetAttribute("val", "http://schemas.openxmlformats.org/wordprocessingml/2006/main") } else { "" })
                $paragraphs.Add([ordered]@{
                    style = $style
                    text = $text
                })
            }
        }
    }
    return [ordered]@{
        text = $textBlocks -join "`n"
        paragraphs = $paragraphs
    }
}

$root = (Resolve-Path -LiteralPath $SourceRoot).Path
if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}
$outputRoot = (Resolve-Path -LiteralPath $OutputDirectory).Path
$files = Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object { $_.Extension.ToLowerInvariant() -eq ".docx" } |
    Sort-Object FullName
$results = New-Object System.Collections.Generic.List[object]

$index = 0
foreach ($file in $files) {
    $index++
    $relativePath = $file.FullName.Substring($root.Length + 1)
    $archive = $null
    try {
        $archive = [IO.Compression.ZipFile]::OpenRead($file.FullName)
        $parts = New-Object System.Collections.Generic.List[object]
        $allText = New-Object System.Collections.Generic.List[string]
        $mainParagraphs = @()
        $mainTables = 0
        foreach ($entry in $archive.Entries | Where-Object {
            $_.FullName -match "^word/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$"
        } | Sort-Object FullName) {
            $xml = Read-EntryXml -Entry $entry
            $isMain = $entry.FullName -eq "word/document.xml"
            $extracted = Get-PartText -Xml $xml -IncludeParagraphDetails $isMain
            if (-not [string]::IsNullOrWhiteSpace($extracted.text)) {
                $allText.Add("[$($entry.FullName)]`n$($extracted.text)")
            }
            $tableCount = $xml.SelectNodes("//*[local-name()='tbl']").Count
            if ($isMain) {
                $mainParagraphs = $extracted.paragraphs
                $mainTables = $tableCount
            }
            $parts.Add([ordered]@{
                part = $entry.FullName
                characters = $extracted.text.Length
                paragraphs = $extracted.paragraphs.Count
                tables = $tableCount
                text = $extracted.text
            })
        }
        $mediaEntries = @($archive.Entries | Where-Object { $_.FullName -like "word/media/*" -and $_.Name })
        $fullText = $allText -join "`n`n"
        $payload = [ordered]@{
            path = $relativePath
            extension = ".docx"
            bytes = $file.Length
            modified = $file.LastWriteTime.ToString("s")
            status = "read"
            textLength = $fullText.Length
            mainParagraphCount = $mainParagraphs.Count
            mainTableCount = $mainTables
            mediaCount = $mediaEntries.Count
            mainParagraphs = $mainParagraphs
            parts = $parts
            text = $fullText
        }
        $outputName = "{0:D3}-{1}.json" -f $index, (Safe-FileName -Value $file.BaseName)
        $payload | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $outputRoot $outputName) -Encoding UTF8
        $results.Add([ordered]@{
            path = $relativePath
            status = "read"
            characters = $fullText.Length
            paragraphs = $mainParagraphs.Count
            tables = $mainTables
            media = $mediaEntries.Count
            output = $outputName
        })
        Write-Output "DONE`t$index`t$($mainParagraphs.Count)`t$mainTables`t$($mediaEntries.Count)`t$($fullText.Length)`t$relativePath"
    }
    catch {
        $results.Add([ordered]@{
            path = $relativePath
            status = "error"
            error = $_.Exception.Message
        })
        Write-Output "ERROR`t$index`t$relativePath`t$($_.Exception.Message)"
    }
    finally {
        if ($null -ne $archive) {
            $archive.Dispose()
        }
    }
}

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString("s")
    sourceRoot = $root
    documentCount = $files.Count
    documentsRead = @($results | Where-Object status -eq "read").Count
    documentErrors = @($results | Where-Object status -eq "error").Count
    totalCharacters = (($results | Where-Object status -eq "read" | ForEach-Object { $_.characters }) | Measure-Object -Sum).Sum
    documents = $results
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outputRoot "_summary.json") -Encoding UTF8
Write-Output "SUMMARY`t$($summary.documentsRead)`t$($summary.documentErrors)`t$($summary.totalCharacters)"
