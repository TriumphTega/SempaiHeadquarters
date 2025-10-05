# PowerShell Script to Apply Professional Design System
Write-Host "🎨 Applying Professional Design System to Sempai HQ..." -ForegroundColor Cyan

# Ensure globals.css is imported in layout
Write-Host "`n1. Checking layout.js..." -ForegroundColor Yellow
$layoutFile = "src\app\layout.js"
if (Test-Path $layoutFile) {
    $content = Get-Content $layoutFile -Raw
    if ($content -notmatch "globals\.css") {
        Write-Host "  → Adding globals.css import..." -ForegroundColor Cyan
        $content = $content -replace "(import.*\n)", "`$1import '../styles/globals.css'`n"
        Set-Content $layoutFile -Value $content -NoNewline
        Write-Host "  ✓ globals.css imported" -ForegroundColor Green
    } else {
        Write-Host "  ✓ globals.css already imported" -ForegroundColor Green
    }
}

Write-Host "`n✅ Design System Ready!" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Review DESIGN_SYSTEM_GUIDE.md for complete styling guide"
Write-Host "2. Apply classes to your components:"
Write-Host "   - Replace buttons with: className='btn btn-primary'"
Write-Host "   - Replace cards with: className='card glass-hover'"
Write-Host "   - Replace forms with: className='form-input', 'form-label'"
Write-Host "   - Use grids with: className='grid grid-3'"
Write-Host "`n3. Test your app - it will look professional and sleek! 🚀"
Write-Host "`nAll styling documentation is in DESIGN_SYSTEM_GUIDE.md" -ForegroundColor Cyan
