# Fix 1: Remove the invalid camera package
$content = Get-Content package.json -Raw
$content = $content -replace '"react-native-windows-camera": "\^0\.1\.0",?', ''
# Fix 2: Update React version to match React Native
$content = $content -replace '"react": "\^19\.1\.0"', '"react": "18.2.0"'
$content | Set-Content package.json

# Then clean and install
rmdir -Recurse -Force node_modules
Remove-Item package-lock.json -Force
npm install --legacy-peer-dep