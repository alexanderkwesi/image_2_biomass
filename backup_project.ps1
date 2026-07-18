# Create backup folder
$backupPath = "../$(Get-Date -Format 'yyyyMMdd_HHmmss')_backup"
New-Item -ItemType Directory -Path $backupPath -Force

# Backup everything except node_modules
Get-ChildItem -Exclude "node_modules", ".git" | Copy-Item -Destination $backupPath -Recurse -Force
Write-Host "Project backed up to: $backupPath" -ForegroundColor Green