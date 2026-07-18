# See what ports are already open
Get-NetFirewallRule | Where-Object { $_.Enabled -eq $true } | Format-Table DisplayName, Direction, Action

# Check port 80 specifically
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*80*" } | Format-Table DisplayName, Enabled