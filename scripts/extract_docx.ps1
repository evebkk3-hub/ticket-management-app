param([Parameter(Mandatory=$true)][string]$PackageDir,[Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
$doc=New-Object System.Xml.XmlDocument
$doc.Load((Join-Path $PackageDir 'word\document.xml'))
$ns=New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
$ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
$ns.AddNamespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
$rels=@{}
$rp=Join-Path $PackageDir 'word\_rels\document.xml.rels'
if(Test-Path $rp){$rx=New-Object System.Xml.XmlDocument;$rx.Load($rp);foreach($n in $rx.DocumentElement.ChildNodes){$rels[$n.Id]=$n.Target}}
$lines=New-Object System.Collections.Generic.List[string]
$pnum=0;$tnum=0
foreach($node in $doc.SelectSingleNode('//w:body',$ns).ChildNodes){
  if($node.LocalName -eq 'p'){
    $pnum++
    $styleNode=$node.SelectSingleNode('./w:pPr/w:pStyle',$ns)
    $style=if($styleNode){$styleNode.GetAttribute('val','http://schemas.openxmlformats.org/wordprocessingml/2006/main')}else{''}
    $text=($node.SelectNodes('.//w:t|.//w:tab|.//w:br',$ns)|ForEach-Object{if($_.LocalName -eq 't'){$_.InnerText}elseif($_.LocalName -eq 'tab'){"`t"}else{' '}})-join''
    $imgs=@($node.SelectNodes('.//a:blip',$ns)|ForEach-Object{$id=$_.GetAttribute('embed','http://schemas.openxmlformats.org/officeDocument/2006/relationships');$rels[$id]})
    if($text -or $imgs.Count){$lines.Add("P$pnum`t[$style]`t$text" + $(if($imgs.Count){"`t<IMAGE:"+($imgs -join ',')+'>'}else{''}))}
  } elseif($node.LocalName -eq 'tbl'){
    $tnum++;$lines.Add("`n=== TABLE $tnum ===")
    $rnum=0
    foreach($row in $node.SelectNodes('./w:tr',$ns)){
      $rnum++;$cells=@()
      foreach($cell in $row.SelectNodes('./w:tc',$ns)){
        $ct=($cell.SelectNodes('.//w:t',$ns)|ForEach-Object{$_.InnerText})-join''
        $cells += ($ct -replace "`r|`n",' ')
      }
      $lines.Add("T$tnum-R$rnum`t"+($cells -join "`t|`t"))
    }
    $lines.Add("=== END TABLE $tnum ===`n")
  }
}
$lines | Set-Content -LiteralPath $OutputPath -Encoding UTF8
[pscustomobject]@{paragraphs=$pnum;tables=$tnum;lines=$lines.Count;images=$rels.Values.Where({$_ -like 'media/*'}).Count}|ConvertTo-Json
