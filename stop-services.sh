#!/bin/bash

PORTS=(3000 3001 3002 3003 3004)

echo -e "\033[36mStopping microservices...\033[0m"
for port in "${PORTS[@]}"; do
  pid=$(lsof -ti ":$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null
    echo -e "\033[33m  Killed process on port $port (PID $pid)\033[0m"
  fi
done

echo ""
echo -e "\033[36mStopping Docker containers...\033[0m"
docker compose down

echo -e "\033[32mAll services stopped.\033[0m"
