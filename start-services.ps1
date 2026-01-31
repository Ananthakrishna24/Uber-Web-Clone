$root = $PSScriptRoot

wt --window 0 `
  new-tab --title "API Gateway"          -d "$root\services\api-gateway"          powershell -NoExit -Command "npm start" `; `
  new-tab --title "User Service"         -d "$root\services\user-service"         powershell -NoExit -Command "npm start" `; `
  new-tab --title "Ride Service"         -d "$root\services\ride-service"         powershell -NoExit -Command "npm start" `; `
  new-tab --title "Location Service"     -d "$root\services\location-service"     powershell -NoExit -Command "npm start" `; `
  new-tab --title "Notification Service" -d "$root\services\notification-service" powershell -NoExit -Command "npm start"
