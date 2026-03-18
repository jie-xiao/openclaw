# Monitor for COM3 and run pio upload when detected

Write-Host "=== ESP32 Auto-Upload Script v2 ==="
Write-Host "1. Press and HOLD the BOOT button on ESP32"
Write-Host "2. Connect USB cable (keep holding BOOT)"
Write-Host "3. Release BOOT button"
Write-Host ""
Write-Host "Waiting for COM3..."

$maxWait = 30
$start = Get-Date

while ((Get-Date) -lt $start.AddSeconds($maxWait)) {
    $ports = [System.IO.Ports.SerialPort]::GetPortNames()

    if ($ports -contains "COM3") {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] COM3 detected! Running upload..."

        # Run PlatformIO upload
        Set-Location "E:\openclaw\ESP"
        $result = & "C:\Users\Administrator\.platformio\penv\Scripts\pio.exe" run --target upload 2>&1

        Write-Host $result

        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n=== UPLOAD SUCCESS ===" -ForegroundColor Green
        } else {
            Write-Host "`n=== UPLOAD FAILED ===" -ForegroundColor Red
        }
        break
    }

    Start-Sleep -Milliseconds 200
}

if ((Get-Date) -ge $start.AddSeconds($maxWait)) {
    Write-Host "Timeout - COM3 not detected"
}
