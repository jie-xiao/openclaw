# List problem devices in Device Manager
$problemDevices = Get-PnpDevice | Where-Object { $_.Status -ne "OK" -and $_.Status -ne "Unknown" }
Write-Host "Problem devices:"
$problemDevices | Select-Object FriendlyName, Status, Problem, InstanceId | Format-Table

# Check for CH340/CH343
Write-Host "`nUSB Serial devices:"
Get-PnpDevice -Class Ports | Select-Object FriendlyName, Status | Format-Table
