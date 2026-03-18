# Fix USB Serial driver

# First, try to reinstall the CH340 driver
$ch340 = Get-PnpDevice -InstanceId "USB*1A86*7522*"

if ($ch340) {
    Write-Host "Found CH340: $($ch340.FriendlyName)"
    Write-Host "Current status: $($ch340.Status)"

    # Try to update driver
    Write-Host "`nTrying to update driver..."
    $result = Update-PnpDevice -InstanceId $ch340.InstanceId -Confirm:$false -ErrorAction SilentlyContinue

    if ($result) {
        Write-Host "Driver updated"
    } else {
        Write-Host "Update failed, trying manual reinstall..."
    }
}

# Try to reinstall ESP32 device
$esp32 = Get-PnpDevice -InstanceId "USB*303A*1001*"

if ($esp32) {
    Write-Host "`nFound ESP32: $($esp32.FriendlyName)"
    Write-Host "Current status: $($esp32.Status)"

    # Try to update driver
    Write-Host "Trying to update driver..."
    Update-PnpDevice -InstanceId $esp32.InstanceId -Confirm:$false -ErrorAction SilentlyContinue
}

# List results
Write-Host "`n--- Results ---"
Get-PnpDevice -Class Ports | Select-Object FriendlyName, Status | Format-Table
