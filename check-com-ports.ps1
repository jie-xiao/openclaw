# Try to force reinstall CH340 driver using pnputil

Write-Host "=== Step 1: Check current devices ==="

# First try to disable and re-enable CH340
$ch340 = Get-PnpDevice -InstanceId "USB*1A86*7522*" -ErrorAction SilentlyContinue
if ($ch340) {
    Write-Host "CH340 found: $($ch340.Status)"
    try {
        Write-Host "Attempting to disable..."
        Disable-PnpDevice -InstanceId $ch340.InstanceId -Confirm:$false -ErrorAction Stop
        Start-Sleep -Seconds 1
        Write-Host "Attempting to enable..."
        Enable-PnpDevice -InstanceId $ch340.InstanceId -Confirm:$false -ErrorAction Stop
    } catch {
        Write-Host "Error: $_"
    }
}

Write-Host "`n=== Step 2: Scan for new devices ==="
pnputil /scan-devices /async

Start-Sleep -Seconds 3

Write-Host "`n=== Step 3: List COM ports ==="
[System.IO.Ports.SerialPort]::GetPortNames()

Write-Host "`n=== Step 4: List all Ports devices ==="
Get-PnpDevice -Class Ports | Select-Object FriendlyName, Status
