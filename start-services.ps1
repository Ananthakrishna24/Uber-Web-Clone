$root = $PSScriptRoot

# Start Docker infrastructure first
Write-Host "Starting Docker containers (PostgreSQL, Redis, Kafka)..." -ForegroundColor Cyan
docker compose -f "$root\docker-compose.yml" up -d
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to start Docker containers. Is Docker Desktop running?" -ForegroundColor Red
  exit 1
}
Write-Host "Docker containers are up!" -ForegroundColor Green

# Wait a moment for services to be ready
Write-Host "Waiting for containers to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start all microservices in Windows Terminal tabs (dev mode with auto-restart)
wt --window 0 `
  new-tab --title "API Gateway"          -d "$root\services\api-gateway"          powershell -NoExit -Command "npm run dev" `; `
  new-tab --title "User Service"         -d "$root\services\user-service"         powershell -NoExit -Command "npm run dev" `; `
  new-tab --title "Ride Service"         -d "$root\services\ride-service"         powershell -NoExit -Command "npm run dev" `; `
  new-tab --title "Location Service"     -d "$root\services\location-service"     powershell -NoExit -Command "npm run dev" `; `
  new-tab --title "Notification Service" -d "$root\services\notification-service" powershell -NoExit -Command "npm run dev"

Write-Host "All services launched in dev mode (auto-restart on file changes)" -ForegroundColor Green
