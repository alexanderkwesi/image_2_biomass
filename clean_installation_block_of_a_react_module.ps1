# Check and update package.json
$package = Get-Content "package.json" -Raw | ConvertFrom-Json

# Add overrides to block windows-camera
if (-not $package.overrides) { $package | Add-Member overrides @{} }
$package.overrides.'react-native-windows-camera' = false
$package.overrides.'@react-native-windows/camera' = false

# Add resolutions (for yarn compatibility)
if (-not $package.resolutions) { $package | Add-Member resolutions @{} }
$package.resolutions.'react-native-windows-camera' = false

# Save updated package.json
$package | ConvertTo-Json -Depth 10 | Out-File "package.json" -Encoding UTF8
Write-Host "Updated package.json with windows-camera blocks" -ForegroundColor Green