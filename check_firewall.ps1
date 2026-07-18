# Check if port 8081 is already open
Get-NetFirewallRule -DisplayName "*8081*" | Format-Table DisplayName, Enabled, Direction, Action

# Check specific port status
Test-NetConnection -ComputerName localhost -Port 8081