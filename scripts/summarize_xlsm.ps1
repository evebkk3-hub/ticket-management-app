param([Parameter(Mandatory=$true)][string]$PackageDir,[Parameter(Mandatory=$true)][string]$OutputDir)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

function Xml([string]$p){ $x=New-Object System.Xml.XmlDocument; $x.Load($p); return (,$x) }
function Ns([System.Xml.XmlDocument]$x){ $n=New-Object System.Xml.XmlNamespaceManager($x.NameTable); $n.AddNamespace('m','http://schemas.openxmlformats.org/spreadsheetml/2006/main'); $n.AddNamespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships'); $n.AddNamespace('p','http://schemas.openxmlformats.org/package/2006/relationships'); return (,$n) }

$shared=@()
$sp=Join-Path $PackageDir 'xl\sharedStrings.xml'
if(Test-Path $sp){
  $sx=Xml $sp; $sn=Ns $sx
  $shared=@($sx.SelectNodes('//m:si',$sn) | ForEach-Object { ($_.SelectNodes('.//m:t',$sn) | ForEach-Object {$_.InnerText}) -join '' })
}
$wb=Xml (Join-Path $PackageDir 'xl\workbook.xml'); $wn=Ns $wb
$rx=Xml (Join-Path $PackageDir 'xl\_rels\workbook.xml.rels'); $rn=Ns $rx
$rel=@{}; foreach($r in $rx.SelectNodes('//p:Relationship',$rn)){ $rel[$r.GetAttribute('Id')]=$r.GetAttribute('Target') }

$inventory=New-Object System.Collections.Generic.List[object]
$samples=New-Object System.Collections.Generic.List[object]
foreach($s in $wb.SelectNodes('//m:sheets/m:sheet',$wn)){
  $name=$s.GetAttribute('name'); $state=$s.GetAttribute('state'); if(!$state){$state='visible'}
  $rid=$s.GetAttribute('id','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $target=$rel[$rid]; $path=Join-Path (Join-Path $PackageDir 'xl') ($target -replace '/','\')
  $x=Xml $path; $n=Ns $x
  $dimNode=$x.SelectSingleNode('//m:dimension',$n); $dim=if($dimNode){$dimNode.GetAttribute('ref')}else{''}
  $cellNodes=$x.SelectNodes('//m:sheetData/m:row/m:c',$n)
  $formulaNodes=$x.SelectNodes('//m:sheetData/m:row/m:c[m:f]',$n)
  $mergeNodes=$x.SelectNodes('//m:mergeCells/m:mergeCell',$n)
  $inventory.Add([pscustomobject]@{sheet=$name;state=$state;dimension=$dim;cells=$cellNodes.Count;formulas=$formulaNodes.Count;merged=$mergeNodes.Count;target=$target})
  $taken=0
  foreach($c in $cellNodes){
    $f=$c.SelectSingleNode('./m:f',$n); $v=$c.SelectSingleNode('./m:v',$n); $is=$c.SelectSingleNode('./m:is',$n)
    $value=''; $type=$c.GetAttribute('t')
    if($type -eq 's' -and $v){$idx=[int]$v.InnerText;if($idx -lt $shared.Count){$value=$shared[$idx]}}
    elseif($type -eq 'inlineStr' -and $is){$value=($is.SelectNodes('.//m:t',$n)|ForEach-Object{$_.InnerText})-join''}
    elseif($v){$value=$v.InnerText}
    if($value -or $f){
      $samples.Add([pscustomobject]@{sheet=$name;cell=$c.GetAttribute('r');value=$value;formula=if($f){$f.InnerText}else{''};type=$type;style=$c.GetAttribute('s')})
      $taken++; if($taken -ge 1500){break}
    }
  }
}
$inventory | Export-Csv (Join-Path $OutputDir 'sheet-inventory.csv') -NoTypeInformation -Encoding UTF8
$samples | Export-Csv (Join-Path $OutputDir 'cell-samples.csv') -NoTypeInformation -Encoding UTF8

$names=New-Object System.Collections.Generic.List[object]
foreach($d in $wb.SelectNodes('//m:definedNames/m:definedName',$wn)){$names.Add([pscustomobject]@{name=$d.GetAttribute('name');localSheetId=$d.GetAttribute('localSheetId');hidden=$d.GetAttribute('hidden');refersTo=$d.InnerText})}
$names | Export-Csv (Join-Path $OutputDir 'defined-names.csv') -NoTypeInformation -Encoding UTF8
[pscustomobject]@{sheetCount=$inventory.Count;definedNames=$names.Count;sharedStrings=$shared.Count;hasVba=(Test-Path (Join-Path $PackageDir 'xl\vbaProject.bin'))} | ConvertTo-Json | Set-Content (Join-Path $OutputDir 'summary.json') -Encoding UTF8
