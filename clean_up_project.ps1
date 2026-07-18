# Remove node_modules if exists
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue

# Remove package-lock.json
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue

# Remove yarn.lock if exists
Remove-Item yarn.lock -Force -ErrorAction SilentlyContinue