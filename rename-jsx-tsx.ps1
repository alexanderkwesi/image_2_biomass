# rename-jsx-tsx-fix-imports.ps1
# Renames files AND updates import statements in all files

param(
    [string]$TargetDirectory = "."
)

Write-Host "Renaming files and fixing imports in: $TargetDirectory" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan

# Counter
$renamedCount = 0
$importsFixed = 0

# Get all .jsx and .tsx files
$jsxFiles = Get-ChildItem -Path $TargetDirectory -Recurse -Filter "*.jsx" -File
$tsxFiles = Get-ChildItem -Path $TargetDirectory -Recurse -Filter "*.tsx" -File
$allFiles = $jsxFiles + $tsxFiles

# First, rename all files
foreach ($file in $allFiles) {
    $oldExt = $file.Extension
    $newExt = if ($oldExt -eq '.jsx') { '.js' } else { '.ts' }
    $newName = $file.FullName -replace "$oldExt$", $newExt
    
    try {
        if (Test-Path $newName) {
            Write-Warning "File exists: $newName - Skipping $($file.FullName)"
            continue
        }
        
        Rename-Item -Path $file.FullName -NewName $newName -Force
        $renamedCount++
        Write-Host "✓ Renamed: $($file.Name) -> $($file.BaseName)$newExt" -ForegroundColor Green
        
    }
    catch {
        Write-Error "Failed to rename $($file.FullName): $_"
    }
}

# Now fix import statements in all .js, .jsx, .ts, .tsx files
Write-Host "`nFixing import statements..." -ForegroundColor Yellow

$codeFiles = Get-ChildItem -Path $TargetDirectory -Recurse -Include "*.js", "*.jsx", "*.ts", "*.tsx", "*.json" -File

foreach ($codeFile in $codeFiles) {
    try {
        $content = Get-Content -Path $codeFile.FullName -Raw
        
        # Replace import statements
        $oldContent = $content
        $content = $content -replace 'from\s+["''](.*?)\.jsx["'']', 'from "$1.js"'
        $content = $content -replace 'from\s+["''](.*?)\.tsx["'']', 'from "$1.ts"'
        $content = $content -replace 'import\s+["''](.*?)\.jsx["'']', 'import "$1.js"'
        $content = $content -replace 'import\s+["''](.*?)\.tsx["'']', 'import "$1.ts"'
        $content = $content -replace 'require\(["''](.*?)\.jsx["'']', 'require("$1.js")'
        $content = $content -replace 'require\(["''](.*?)\.tsx["'']', 'require("$1.ts")'
        
        if ($content -ne $oldContent) {
            Set-Content -Path $codeFile.FullName -Value $content -NoNewline
            $importsFixed++
            Write-Host "✓ Updated imports in: $($codeFile.Name)" -ForegroundColor Blue
        }
        
    }
    catch {
        Write-Error "Failed to process $($codeFile.FullName): $_"
    }
}

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "COMPLETE - SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "Files renamed: $renamedCount" -ForegroundColor Green
Write-Host "Files with imports fixed: $importsFixed" -ForegroundColor Green
Write-Host "`nDone!" -ForegroundColor Cyan