$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docPath = "d:\CBSV\public\1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.doc"
    $docxPath = "d:\CBSV\public\1. Mau 10_KND_Ban tu kiem diem_DHKT_2025.docx"
    
    if (Test-Path $docPath) {
        Write-Host "Opening binary .doc template..."
        $doc = $word.Documents.Open($docPath)
        
        Write-Host "Saving as modern .docx template..."
        $doc.SaveAs($docxPath, 16) # 16 is wdFormatDocumentDefault (.docx)
        $doc.Close()
        Write-Host "SUCCESS: Converted .doc to .docx successfully!"
    } else {
        Write-Host "Error: Source .doc file not found!"
    }
} catch {
    Write-Host "Error during conversion: $_"
} finally {
    $word.Quit()
}
