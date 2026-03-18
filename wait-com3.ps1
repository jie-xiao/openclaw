# Monitor for COM3 appearance and keep it open
Write-Host "Waiting for ESP32 (COM3) to appear..."
Write-Host "Press Ctrl+C to exit"
Write-Host ""

$timeout = 30
$start = Get-Date

while ((Get-Date) -lt $start.AddSeconds($timeout)) {
    $ports = [System.IO.Ports.SerialPort]::GetPortNames()

    if ($ports -contains "COM3") {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] COM3 detected! Ports: $($ports -join ', ')"

        # Try to get device info
        $dev = Get-PnpDevice -Class Ports -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -like "*COM3*" }
        if ($dev) {
            Write-Host "  Device: $($dev.FriendlyName)"
            Write-Host "  Status: $($dev.Status)"
        }

        # Keep checking for a few seconds
        for ($i = 0; $i -lt 10; $i++) {
            Start-Sleep -Seconds 1
            $ports2 = [System.IO.SerialPort]::GetPortNames()
            if ($ports2 -notcontains "COM3") {
                Write-Host "  COM3 disappeared!"
                break
            }
            Write-Host "  COM3 still present... ($i/10)"
        }

        Write-Host ""
        Write-Host "=== Current Status ==="
        Get-PnpDevice -Class Ports | Select-Object FriendlyName, Status
        break
    }

    Start-Sleep -Milliseconds 500
}

if ((Get-Date) -ge $start.AddSeconds($timeout)) {
    Write-Host "Timeout - COM3 not detected"
}
