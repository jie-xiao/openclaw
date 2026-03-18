# Check and fix ESP32 COM port
$dev = Get-PnpDevice -InstanceId "USB*303A*1001*" | Where-Object { $_.FriendlyName -like "*COM*" } | Select-Object -First 1

if ($dev) {
    Write-Host "Found device: $($dev.FriendlyName), Status: $($dev.Status)"

    # Try to disable and re-enable
    Write-Host "Attempting to disable..."
    Disable-PnpDevice -InstanceId $dev.InstanceId -Confirm:$false
    Start-Sleep -Seconds 2

    Write-Host "Attempting to enable..."
    Enable-PnpDevice -InstanceId $dev.InstanceId -Confirm:$false
    Start-Sleep -Seconds 2

    # Check result
    $dev2 = Get-PnpDevice -InstanceId $dev.InstanceId
    Write-Host "New status: $($dev2.Status)"
} else {
    Write-Host "No ESP32 device found"
}

# List all COM ports
Write-Host "`nAvailable COM ports:"
[System.IO.Ports.SerialPort]::GetPortNames()
