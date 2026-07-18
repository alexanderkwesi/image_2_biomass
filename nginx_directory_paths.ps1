# Create necessary directories
mkdir C:\nginx-use\conf\sites-available
mkdir C:\nginx-use\conf\sites-enabled
mkdir C:\nginx-use\logs
mkdir C:\nginx-use\www
mkdir C:\nginx-use\www\uploads
mkdir C:\nginx-use\www\api.yourdomain.com
mkdir C:\nginx-use\www\api.yourdomain.com\html

# Create test files
Set-Content -Path "C:\nginx-use\www\api.yourdomain.com\html\index.html" -Value @"
<!DOCTYPE html>
<html>
<head>
    <title>API Server - Windows</title>
</head>
<body>
    <h1>nginx on Windows is Running!</h1>
    <p>Your API server is successfully installed and running on Windows.</p>
</body>
</html>
"@