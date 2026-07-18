Write-Host "=== EXPO COMPLETE SETUP ===" -ForegroundColor Cyan

# Check prerequisites
Write-Host "`n1. Checking prerequisites..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
$npmVersion = npm --version 2>$null

if (-not $nodeVersion) {
    Write-Host "Node.js is not installed! Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "   npm: $npmVersion" -ForegroundColor Green

# Install global packages
Write-Host "`n2. Installing global Expo tools..." -ForegroundColor Yellow
npm install -g expo-cli expo eas-cli

# Verify installations
Write-Host "`n3. Verifying installations..." -ForegroundColor Yellow
try {
    $expoVersion = expo --version
    Write-Host "   Expo CLI: $expoVersion" -ForegroundColor Green
}
catch {
    Write-Host "   Expo CLI not found" -ForegroundColor Red
}

try {
    $easVersion = eas --version
    Write-Host "   EAS CLI: $easVersion" -ForegroundColor Green
}
catch {
    Write-Host "   EAS CLI not found" -ForegroundColor Yellow
}

# Create sample project
Write-Host "`n4. Create a sample Expo project? (y/n)" -ForegroundColor Yellow
$create = Read-Host

if ($create -eq 'y') {
    $projectName = Read-Host "Enter project name"
    npx create-expo-app $projectName --template blank
    
    cd $projectName
    
    # Install common dependencies
    Write-Host "`n5. Installing common dependencies..." -ForegroundColor Yellow
    npx expo install react-native react-native-web react-native-safe-area-context
    npx expo install @react-navigation/native react-native-screens react-native-safe-area-context react-native-gesture-handler
    
    Write-Host "`n=== SETUP COMPLETE ===" -ForegroundColor Cyan
    Write-Host "To start your Expo app:" -ForegroundColor Green
    Write-Host "cd $projectName" -ForegroundColor White
    Write-Host "npx expo start" -ForegroundColor White
}