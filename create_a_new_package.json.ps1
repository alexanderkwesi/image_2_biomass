# Create a new package.json file
$packageJson = @{
    name            = "image-2-biomass-ml-project"
    version         = "1.0.0"
    main            = "expo/AppEntry.js"
    private         = $true
    scripts         = @{
        start   = "expo start"
        android = "expo start --android"
        ios     = "expo start --ios"
        web     = "expo start --web"
        build   = "expo build:web"
        eject   = "expo eject"
        test    = "jest"
    }
    dependencies    = @{
        expo               = "^51.0.0"
        react              = "18.2.0"
        "react-dom"        = "18.2.0"
        "react-native"     = "0.74.3"
        "react-native-web" = "~0.19.10"
    }
    devDependencies = @{
        "@babel/core"         = "^7.20.0"
        "@types/react"        = "^18.2.45"
        "@types/react-native" = "^0.73.0"
        jest                  = "^29.2.1"
        "jest-expo"           = "^51.0.0"
        "react-test-renderer" = "18.2.0"
        typescript            = "^5.3.0"
    }
    jest            = @{
        preset                  = "jest-expo"
        transformIgnorePatterns = @(
            "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
        )
    }
}

# Save to file
$packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "package.json" -Encoding UTF8
Write-Host "package.json created successfully!" -ForegroundColor Green