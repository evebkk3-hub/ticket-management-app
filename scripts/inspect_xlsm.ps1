param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputDir
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$zipPath = Join-Path $OutputDir 'workbook.zip'
$extractDir = Join-Path $OutputDir 'package'
Copy-Item -LiteralPath $InputPath -Destination $zipPath -Force
if (Test-Path -LiteralPath $extractDir) { Remove-Item -LiteralPath $extractDir -Recurse -Force }
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force

function Load-Xml([string]$Path) {
  $doc = New-Object System.Xml.XmlDocument
  $doc.PreserveWhitespace = $false
  $doc.Load($Path)
  return $doc
}

$shared = @()
$sharedPath = Join-Path $extractDir 'xl/sharedStrings.xml'
if (Test-Path -LiteralPath $sharedPath) {
  $sx = Load-Xml $sharedPath
  foreach ($si in $sx.sst.si) {
    if ($si.t) { $shared += [string]$si.t }
    elseif ($si.r) { $shared += (($si.r | ForEach-Object { [string]$_.t }) -join '') }
    else { $shared += '' }
  }
}

$wb = Load-Xml (Join-Path $extractDir 'xl/workbook.xml')
$rels = Load-Xml (Join-Path $extractDir 'xl/_rels/workbook.xml.rels')
$relMap = @{}
foreach ($rel in $rels.Relationships.Relationship) { $relMap[[string]$rel.Id] = [string]$rel.Target }

$definedNames = @()
if ($wb.workbook.definedNames) {
  foreach ($dn in $wb.workbook.definedNames.definedName) {
    $definedNames += [pscustomobject]@{ name=[string]$dn.name; localSheetId=[string]$dn.localSheetId; hidden=[string]$dn.hidden; refersTo=[string]$dn.'#text' }
  }
}

$sheetResults = @()
foreach ($sheet in $wb.workbook.sheets.sheet) {
  $name = [string]$sheet.name
  $state = if ($sheet.state) { [string]$sheet.state } else { 'visible' }
  $rid = [string]$sheet.'r:id'
  if (-not $rid) { $rid = [string]$sheet.GetAttribute('id','http://schemas.openxmlformats.org/officeDocument/2006/relationships') }
  $target = $relMap[$rid] -replace '/', '\'
  $sheetPath = Join-Path (Join-Path $extractDir 'xl') $target
  $xml = Load-Xml $sheetPath
  $dimension = if ($xml.worksheet.dimension) { [string]$xml.worksheet.dimension.ref } else { '' }
  $rows = @()
  $formulaCount = 0
  $nonEmptyCount = 0
  foreach ($row in $xml.worksheet.sheetData.row) {
    $cells = @()
    foreach ($c in $row.c) {
      $ref = [string]$c.r
      $type = [string]$c.t
      $formula = if ($c.f) { [string]$c.f } else { '' }
      if ($formula) { $formulaCount++ }
      $value = ''
      if ($type -eq 's' -and $c.v -ne $null) { $idx=[int]$c.v; if ($idx -lt $shared.Count) { $value=$shared[$idx] } }
      elseif ($type -eq 'inlineStr') {
        if ($c.is.t) { $value=[string]$c.is.t } elseif ($c.is.r) { $value=(($c.is.r | ForEach-Object { [string]$_.t }) -join '') }
      }
      elseif ($c.v -ne $null) { $value=[string]$c.v }
      if ($value -or $formula) { $nonEmptyCount++; $cells += [pscustomobject]@{ ref=$ref; value=$value; formula=$formula; type=$type; style=[string]$c.s } }
    }
    if ($cells.Count -gt 0) { $rows += [pscustomobject]@{ row=[int]$row.r; cells=$cells } }
  }
  $sheetResults += [pscustomobject]@{
    name=$name; state=$state; sheetId=[string]$sheet.sheetId; relationshipId=$rid; target=$target;
    dimension=$dimension; rowCount=$rows.Count; nonEmptyCellCount=$nonEmptyCount; formulaCount=$formulaCount; rows=$rows
  }
}

$macroPath = Join-Path $extractDir 'xl/vbaProject.bin'
$result = [pscustomobject]@{
  source=$InputPath
  hasVbaProject=(Test-Path -LiteralPath $macroPath)
  calculation=[pscustomobject]@{ calcMode=[string]$wb.workbook.calcPr.calcMode; fullCalcOnLoad=[string]$wb.workbook.calcPr.fullCalcOnLoad; forceFullCalc=[string]$wb.workbook.calcPr.forceFullCalc }
  definedNames=$definedNames
  sheets=$sheetResults
}
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutputDir 'workbook-analysis.json') -Encoding UTF8

$sheetResults | Select-Object name,state,dimension,rowCount,nonEmptyCellCount,formulaCount,target |
  Export-Csv -LiteralPath (Join-Path $OutputDir 'sheet-inventory.csv') -NoTypeInformation -Encoding UTF8
$definedNames | Export-Csv -LiteralPath (Join-Path $OutputDir 'defined-names.csv') -NoTypeInformation -Encoding UTF8
$result | Select-Object source,hasVbaProject,@{n='sheetCount';e={$_.sheets.Count}},@{n='definedNameCount';e={$_.definedNames.Count}} |
  ConvertTo-Json | Set-Content -LiteralPath (Join-Path $OutputDir 'summary.json') -Encoding UTF8
