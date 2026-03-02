#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start Docker infrastructure first
echo -e "\033[36mStarting Docker containers (PostgreSQL, Redis, Kafka)...\033[0m"
docker compose -f "$ROOT/docker-compose.yml" up -d
if [ $? -ne 0 ]; then
  echo -e "\033[31mFailed to start Docker containers. Is Docker running?\033[0m"
  exit 1
fi
echo -e "\033[32mDocker containers are up!\033[0m"

# Wait for containers to be ready
echo -e "\033[33mWaiting for containers to be ready...\033[0m"
sleep 3

# Start all microservices in background with dev mode
SERVICES=("api-gateway" "user-service" "ride-service" "location-service" "notification-service")
PIDS=()

for service in "${SERVICES[@]}"; do
  echo -e "\033[36mStarting $service...\033[0m"
  cd "$ROOT/services/$service"
  npm run dev &
  PIDS+=($!)
done

echo ""
echo -e "\033[32mAll services launched in dev mode (auto-restart on file changes)\033[0m"
echo -e "\033[33mService PIDs: ${PIDS[*]}\033[0m"
echo -e "\033[33mPress Ctrl+C to stop all services\033[0m"

# Trap Ctrl+C to kill all child processes
trap 'echo -e "\n\033[31mStopping all services...\033[0m"; kill "${PIDS[@]}" 2>/dev/null; exit 0' SIGINT SIGTERM

# Wait for all background processes
wait
