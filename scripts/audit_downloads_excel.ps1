param(
    [string]$SourceRoot = "C:\Users\lenovo\Downloads",
    [string]$OutputPath = "tmp\downloads-memory-audit\excel-audit.json"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-NamespaceManager {
    param([xml]$Document)
    $manager = New-Object System.Xml.XmlNamespaceManager($Document.NameTable)
    $manager.AddNamespace("s", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $manager.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
    $manager.AddNamespace("pr", "http://schemas.openxmlformats.org/package/2006/relationships")
    return ,$manager
}

function Read-ZipXml {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName
    )
    $entry = $Archive.GetEntry($EntryName)
    if ($null -eq $entry) {
        return $null
    }
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream, [Text.Encoding]::UTF8, $true)
    try {
        return [xml]$reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
        $stream.Dispose()
    }
}

function Get-SharedStrings {
    param([System.IO.Compression.ZipArchive]$Archive)
    $xml = Read-ZipXml -Archive $Archive -EntryName "xl/sharedStrings.xml"
    if ($null -eq $xml) {
        return @()
    }
    $values = New-Object System.Collections.Generic.List[string]
    foreach ($item in $xml.SelectNodes("//*[local-name()='si']")) {
        $parts = $item.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.InnerText }
        $values.Add(($parts -join ""))
    }
    return $values.ToArray()
}

function Get-CellText {
    param(
        [System.Xml.XmlElement]$Cell,
        [string[]]$SharedStrings
    )
    $type = $Cell.GetAttribute("t")
    $valueNode = $Cell.SelectSingleNode("./*[local-name()='v']")
    $inlineNodes = $Cell.SelectNodes("./*[local-name()='is']//*[local-name()='t']")
    if ($type -eq "inlineStr") {
        return (($inlineNodes | ForEach-Object { $_.InnerText }) -join "")
    }
    if ($null -eq $valueNode) {
        return ""
    }
    $raw = $valueNode.InnerText
    if ($type -eq "s") {
        $index = 0
        if ([int]::TryParse($raw, [ref]$index) -and $index -ge 0 -and $index -lt $SharedStrings.Count) {
            return $SharedStrings[$index]
        }
    }
    if ($type -eq "b") {
        return $(if ($raw -eq "1") { "TRUE" } else { "FALSE" })
    }
    return $raw
}

function Resolve-WorksheetPath {
    param(
        [string]$Target
    )
    $normalized = $Target.Replace("\", "/")
    if ($normalized.StartsWith("/")) {
        return $normalized.TrimStart("/")
    }
    if ($normalized.StartsWith("xl/")) {
        return $normalized
    }
    while ($normalized.StartsWith("../")) {
        $normalized = $normalized.Substring(3)
    }
    return "xl/" + $normalized.TrimStart("/")
}

function Read-WorksheetAudit {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName,
        [string[]]$SharedStrings
    )
    $entry = $Archive.GetEntry($EntryName)
    if ($null -eq $entry) {
        throw "Worksheet XML not found: $EntryName"
    }
    $settings = New-Object System.Xml.XmlReaderSettings
    $settings.IgnoreComments = $true
    $settings.IgnoreWhitespace = $true
    $stream = $entry.Open()
    $reader = [System.Xml.XmlReader]::Create($stream, $settings)
    $dimension = ""
    $mergedCount = 0
    $cellNodes = 0
    $nonEmptyCount = 0
    $formulaCount = 0
    $errorCount = 0
    $samples = New-Object System.Collections.Generic.List[object]
    $formulaSamples = New-Object System.Collections.Generic.List[object]
    $inCell = $false
    $address = ""
    $cellType = ""
    $rawValue = ""
    $inlineText = ""
    $formulaText = ""

    try {
        while ($reader.Read()) {
            if ($reader.NodeType -eq [System.Xml.XmlNodeType]::Element) {
                switch ($reader.LocalName) {
                    "dimension" {
                        $dimension = $reader.GetAttribute("ref")
                    }
                    "mergeCells" {
                        $countText = $reader.GetAttribute("count")
                        $parsedCount = 0
                        if ([int]::TryParse($countText, [ref]$parsedCount)) {
                            $mergedCount = $parsedCount
                        }
                    }
                    "c" {
                        $inCell = $true
                        $cellNodes++
                        $address = $reader.GetAttribute("r")
                        $cellType = $reader.GetAttribute("t")
                        $rawValue = ""
                        $inlineText = ""
                        $formulaText = ""
                    }
                    "v" {
                        if ($inCell -and -not $reader.IsEmptyElement) {
                            $rawValue = $reader.ReadString()
                        }
                    }
                    "f" {
                        if ($inCell -and -not $reader.IsEmptyElement) {
                            $formulaText = $reader.ReadString()
                        }
                    }
                    "t" {
                        if ($inCell -and $cellType -eq "inlineStr" -and -not $reader.IsEmptyElement) {
                            $inlineText += $reader.ReadString()
                        }
                    }
                }
            }
            elseif ($reader.NodeType -eq [System.Xml.XmlNodeType]::EndElement -and $reader.LocalName -eq "c") {
                $text = $rawValue
                if ($cellType -eq "inlineStr") {
                    $text = $inlineText
                }
                elseif ($cellType -eq "s") {
                    $sharedIndex = 0
                    if ([int]::TryParse($rawValue, [ref]$sharedIndex) -and
                        $sharedIndex -ge 0 -and $sharedIndex -lt $SharedStrings.Count) {
                        $text = $SharedStrings[$sharedIndex]
                    }
                }
                elseif ($cellType -eq "b") {
                    $text = $(if ($rawValue -eq "1") { "TRUE" } else { "FALSE" })
                }
                if (-not [string]::IsNullOrWhiteSpace($text)) {
                    $nonEmptyCount++
                    if ($samples.Count -lt 80) {
                        $samples.Add([ordered]@{
                            cell = $address
                            value = $text.Substring(0, [Math]::Min(300, $text.Length))
                        })
                    }
                }
                if (-not [string]::IsNullOrWhiteSpace($formulaText)) {
                    $formulaCount++
                    if ($formulaSamples.Count -lt 30) {
                        $formulaSamples.Add([ordered]@{
                            cell = $address
                            formula = $formulaText.Substring(0, [Math]::Min(500, $formulaText.Length))
                            cachedValue = $text
                        })
                    }
                }
                if ($cellType -eq "e" -or $text -match "^#(REF!|DIV/0!|VALUE!|NAME\?|N/A|NUM!|NULL!)$") {
                    $errorCount++
                }
                $inCell = $false
            }
        }
    }
    finally {
        $reader.Dispose()
        $stream.Dispose()
    }
    return [ordered]@{
        dimension = $dimension
        cellNodes = $cellNodes
        nonEmptyCells = $nonEmptyCount
        formulas = $formulaCount
        formulaErrors = $errorCount
        mergedRanges = $mergedCount
        samples = $samples
        formulaSamples = $formulaSamples
    }
}

$root = (Resolve-Path -LiteralPath $SourceRoot).Path
$workbooks = Get-ChildItem -LiteralPath $root -Recurse -File |
    Where-Object { $_.Extension.ToLowerInvariant() -in @(".xlsx", ".xlsm") } |
    Sort-Object FullName

$results = New-Object System.Collections.Generic.List[object]
$workbookIndex = 0
foreach ($file in $workbooks) {
    $workbookIndex++
    Write-Progress -Activity "Auditing Excel workbooks" -Status "$workbookIndex / $($workbooks.Count): $($file.Name)" -PercentComplete (($workbookIndex / [Math]::Max(1, $workbooks.Count)) * 100)
    $relativePath = $file.FullName.Substring($root.Length + 1)
    $archive = $null
    try {
        $archive = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
        $workbookXml = Read-ZipXml -Archive $archive -EntryName "xl/workbook.xml"
        $relsXml = Read-ZipXml -Archive $archive -EntryName "xl/_rels/workbook.xml.rels"
        if ($null -eq $workbookXml -or $null -eq $relsXml) {
            throw "Workbook metadata is missing."
        }
        $sharedStrings = Get-SharedStrings -Archive $archive
        $relationshipTargets = @{}
        foreach ($relationship in $relsXml.SelectNodes("//*[local-name()='Relationship']")) {
            $relationshipTargets[$relationship.GetAttribute("Id")] = $relationship.GetAttribute("Target")
        }

        $sheetResults = New-Object System.Collections.Generic.List[object]
        $sheetIndex = 0
        foreach ($sheet in $workbookXml.SelectNodes("//*[local-name()='sheets']/*[local-name()='sheet']")) {
            $sheetIndex++
            $sheetName = $sheet.GetAttribute("name")
            $state = $sheet.GetAttribute("state")
            if ([string]::IsNullOrWhiteSpace($state)) {
                $state = "visible"
            }
            $relationshipId = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
            $target = $relationshipTargets[$relationshipId]
            $entryName = Resolve-WorksheetPath -Target $target
            try {
                $audit = Read-WorksheetAudit -Archive $archive -EntryName $entryName -SharedStrings $sharedStrings
            }
            catch {
                $sheetResults.Add([ordered]@{
                    index = $sheetIndex
                    name = $sheetName
                    state = $state
                    status = "error"
                    error = $_.Exception.Message
                })
                continue
            }
            $sheetResults.Add([ordered]@{
                index = $sheetIndex
                name = $sheetName
                state = $state
                status = "read"
                dimension = $audit.dimension
                cellNodes = $audit.cellNodes
                nonEmptyCells = $audit.nonEmptyCells
                formulas = $audit.formulas
                formulaErrors = $audit.formulaErrors
                mergedRanges = $audit.mergedRanges
                samples = $audit.samples
                formulaSamples = $audit.formulaSamples
            })
        }
        $results.Add([ordered]@{
            path = $relativePath
            bytes = $file.Length
            modified = $file.LastWriteTime.ToString("s")
            status = "read"
            sheetCount = $sheetResults.Count
            sheets = $sheetResults
        })
    }
    catch {
        $results.Add([ordered]@{
            path = $relativePath
            bytes = $file.Length
            modified = $file.LastWriteTime.ToString("s")
            status = "error"
            error = $_.Exception.Message
            errorLocation = $_.InvocationInfo.PositionMessage
            sheetCount = 0
            sheets = @()
        })
    }
    finally {
        if ($null -ne $archive) {
            $archive.Dispose()
        }
    }
}
Write-Progress -Activity "Auditing Excel workbooks" -Completed

$parent = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}
$payload = [ordered]@{
    generatedAt = (Get-Date).ToString("s")
    sourceRoot = $root
    workbookCount = $workbooks.Count
    workbooksRead = @($results | Where-Object status -eq "read").Count
    workbookErrors = @($results | Where-Object status -eq "error").Count
    totalSheets = ($results | ForEach-Object { $_.sheetCount } | Measure-Object -Sum).Sum
    workbooks = $results
}
$payload | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Output "AUDIT_PATH=$((Resolve-Path -LiteralPath $OutputPath).Path)"
Write-Output "WORKBOOKS=$($payload.workbookCount)"
Write-Output "READ=$($payload.workbooksRead)"
Write-Output "ERRORS=$($payload.workbookErrors)"
Write-Output "SHEETS=$($payload.totalSheets)"
