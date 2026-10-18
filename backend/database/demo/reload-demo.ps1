<#
.SYNOPSIS
    Nạp lại dữ liệu demo Smart Bus Ticketing với các chuyến động theo thời gian thực.
.DESCRIPTION
    Script thực thi nạp file smart-bus-demo-data.sql vào MySQL, tự động phát hiện đường dẫn mysql.exe,
    tạo database smart_bus_ticketing, 7 tài khoản demo và dời ngày chuyến để luôn có ít nhất 4 chuyến trong tương lai.
.PARAMETER User
    Tên tài khoản MySQL (mặc định: root).
.PARAMETER Password
    Mật khẩu tài khoản MySQL (nếu có).
.PARAMETER Hostname
    Địa chỉ máy chủ MySQL (mặc định: 127.0.0.1).
.PARAMETER Port
    Cổng MySQL (mặc định: 3306).
.PARAMETER Database
    Tên database (mặc định: smart_bus_ticketing).
.EXAMPLE
    .\reload-demo.ps1
    .\reload-demo.ps1 -User root -Password "123456"
#>
param (
    [string]$User = $(if ($env:MYSQL_USER) { $env:MYSQL_USER } else { "root" }),
    [string]$Password = $(if ($env:MYSQL_PASSWORD) { $env:MYSQL_PASSWORD } else { "" }),
    [string]$Hostname = $(if ($env:MYSQL_HOST) { $env:MYSQL_HOST } else { "127.0.0.1" }),
    [int]$Port = $(if ($env:MYSQL_PORT) { [int]$env:MYSQL_PORT } else { 3306 }),
    [string]$Database = $(if ($env:MYSQL_DB) { $env:MYSQL_DB } else { "smart_bus_ticketing" })
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "smart-bus-demo-data.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Error "Không tìm thấy file $sqlFile"
    exit 1
}

# Tìm mysql.exe
$mysqlBin = "mysql"
$mysqlCmd = Get-Command "mysql" -ErrorAction SilentlyContinue
if (-not $mysqlCmd) {
    $candidatePaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.3\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    foreach ($path in $candidatePaths) {
        if (Test-Path $path) {
            $mysqlBin = $path
            break
        }
    }
}

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "🔄 NẠP LẠI DỮ LIỆU DEMO SMART BUS TICKETING (POWERSHELL)" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "📌 MySQL Binary : $mysqlBin"
Write-Host "📌 Host/Port    : $Hostname:$Port"
Write-Host "📌 User         : $User"
Write-Host "📌 Database     : $Database"
Write-Host "📌 SQL File     : $sqlFile"
Write-Host "--------------------------------------------------------------------"

$mysqlArgs = @("-h", $Hostname, "-P", $Port, "-u", $User, "--default-character-set=utf8mb4")
if ($Password) {
    $mysqlArgs += "-p$Password"
}

Write-Host "⏳ Đang nhập dữ liệu demo vào MySQL..." -ForegroundColor Yellow

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $mysqlBin
$processInfo.Arguments = ($mysqlArgs -join " ")
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
$processInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8

$process = [System.Diagnostics.Process]::Start($processInfo)
$sqlContent = [System.IO.File]::ReadAllText($sqlFile, [System.Text.Encoding]::UTF8)
$process.StandardInput.Write($sqlContent)
$process.StandardInput.Close()

$output = $process.StandardOutput.ReadToEnd()
$errOutput = $process.StandardError.ReadToEnd()
$process.WaitForExit()

if ($process.ExitCode -ne 0) {
    Write-Host "❌ Nạp dữ liệu thất bại (Exit code: $($process.ExitCode)):" -ForegroundColor Red
    Write-Host $errOutput -ForegroundColor Red
    exit $process.ExitCode
}

Write-Host "✅ Nạp dữ liệu thành công!" -ForegroundColor Green

# SCRUM-87: Dời ngày chuyến theo hôm nay để luôn có ít nhất 4 chuyến tương lai (thêm ORDER BY DepartureAt DESC tránh trùng IX_trips_BusId_DepartureAt)
$shiftTripsQuery = "SET @ref_date = (SELECT DATE(DepartureAt) FROM trips WHERE Id = 4); SET @day_diff = DATEDIFF(CURRENT_DATE(), @ref_date); UPDATE trips SET DepartureAt = DATE_ADD(DepartureAt, INTERVAL @day_diff DAY) ORDER BY DepartureAt DESC;"
$shiftArgs = @("-h", $Hostname, "-P", $Port, "-u", $User, "-D", $Database, "-e", $shiftTripsQuery)
if ($Password) { $shiftArgs += "-p$Password" }
& $mysqlBin @shiftArgs | Out-Null

# Kiểm tra số chuyến tương lai (> UTC_TIMESTAMP + 30 phút)
$checkTripsQuery = "SELECT COUNT(*) FROM trips WHERE Status='Scheduled' AND BusId IS NOT NULL AND DepartureAt > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE);"
$tripsCheckArgs = @("-h", $Hostname, "-P", $Port, "-u", $User, "-N", "-D", $Database, "-e", $checkTripsQuery)
if ($Password) { $tripsCheckArgs += "-p$Password" }

$checkProc = Start-Process -FilePath $mysqlBin -ArgumentList $tripsCheckArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\trips_check.txt" -RedirectStandardError "$env:TEMP\trips_err.txt"
$futureCount = 0
if ($checkProc.ExitCode -eq 0 -and (Test-Path "$env:TEMP\trips_check.txt")) {
    $futureCountStr = (Get-Content "$env:TEMP\trips_check.txt").Trim()
    [int]::TryParse($futureCountStr, [ref]$futureCount) | Out-Null
}

# Nếu chạy vào cuối ngày chưa đủ 4 chuyến tương lai, dời thêm ngày
while ($futureCount -lt 4) {
    $bumpQuery = "UPDATE trips SET DepartureAt = DATE_ADD(DepartureAt, INTERVAL 1 DAY) ORDER BY DepartureAt DESC;"
    $bumpArgs = @("-h", $Hostname, "-P", $Port, "-u", $User, "-D", $Database, "-e", $bumpQuery)
    if ($Password) { $bumpArgs += "-p$Password" }
    & $mysqlBin @bumpArgs | Out-Null

    $checkProc = Start-Process -FilePath $mysqlBin -ArgumentList $tripsCheckArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\trips_check.txt" -RedirectStandardError "$env:TEMP\trips_err.txt"
    if ($checkProc.ExitCode -eq 0 -and (Test-Path "$env:TEMP\trips_check.txt")) {
        $futureCountStr = (Get-Content "$env:TEMP\trips_check.txt").Trim()
        [int]::TryParse($futureCountStr, [ref]$futureCount) | Out-Null
    }
}

Write-Host "🚍 Số chuyến trong tương lai sẵn sàng đặt vé: $futureCount" -ForegroundColor Green

Write-Host "`n👤 7 tài khoản demo đã sẵn sàng (Mật khẩu: Admin@12345):" -ForegroundColor Green
Write-Host "   - admin (Admin): Hoạt động"
Write-Host "   - manager (Manager): Hoạt động"
Write-Host "   - driver1, driver2 (Driver): Hoạt động"
Write-Host "   - conductor1, conductor2 (Conductor): Hoạt động"
Write-Host "   - passenger1 (Passenger): Hoạt động"
Write-Host "====================================================================" -ForegroundColor Cyan
