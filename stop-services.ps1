$ports = @(3000, 3001, 3002, 3003, 3004)

Write-Host "Stopping microservices..." -ForegroundColor Cyan
foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "  Killed process on port $port (PID $($conn.OwningProcess))" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Stopping Docker containers..." -ForegroundColor Cyan
docker compose down

Write-Host "All services stopped." -ForegroundColor Green
