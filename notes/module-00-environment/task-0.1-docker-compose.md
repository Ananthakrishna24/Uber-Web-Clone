# Task 0.1 — Docker Compose Setup

## Why Docker Compose?

We're building 5 microservices. Each one needs PostgreSQL, Redis, and Kafka.
Installing and configuring all of these manually is painful and not reproducible.

- **Docker Container** — A lightweight, isolated mini-computer running one thing
  (like PostgreSQL). It runs the same everywhere.
- **Docker Compose** — A YAML file that says "start all these containers together,
  and let them talk to each other."

```
WITHOUT Docker:
  You → install PostgreSQL manually
  You → install Redis manually
  You → install Kafka manually (painful)
  You → configure them all to work together
  Friend → does the same (different OS, different errors)

WITH Docker Compose:
  You → docker-compose up
  Friend → docker-compose up
  Done. Identical setup.
```

## What We Need Running

```
┌─────────────────────────────────────────────┐
│            Docker Compose Network            │
│                                              │
│  ┌───────────┐  ┌───────────┐               │
│  │ Zookeeper │◄─│   Kafka   │               │
│  │   :2181   │  │   :9092   │               │
│  └───────────┘  └───────────┘               │
│                                              │
│  ┌───────────┐  ┌───────────┐               │
│  │ PostgreSQL│  │   Redis   │               │
│  │   :5432   │  │   :6379   │               │
│  └───────────┘  └───────────┘               │
│                                              │
│  All containers can talk to each other       │
│  by name (e.g., kafka:9092, redis:6379)      │
└─────────────────────────────────────────────┘
```

## Why Kafka Needs Zookeeper

Kafka uses Zookeeper to manage its cluster — tracking which brokers (Kafka servers)
are alive, which topics exist, leader election, etc. So our Kafka container must
know where Zookeeper is via `KAFKA_ZOOKEEPER_CONNECT`.

> Note: Newer Kafka versions (3.5+) have KRaft mode which removes the Zookeeper
> dependency, but we're using Zookeeper mode because most tutorials and production
> setups still reference it, and it's important to understand.

## Key Docker Compose Concepts

### Images
Pre-built packages that contain everything needed to run a service.
- `postgres:15` — Official PostgreSQL image, version 15
- `redis:7-alpine` — Redis 7 on Alpine Linux (smaller image)
- `confluentinc/cp-zookeeper:7.5.0` — Confluent's Zookeeper
- `confluentinc/cp-kafka:7.5.0` — Confluent's Kafka

### Ports
`"host:container"` — Maps a port on YOUR machine to a port inside the container.
- `"5432:5432"` means localhost:5432 → container's port 5432

### Environment Variables
Configuration passed into the container. Each image documents what env vars it
expects.

### depends_on
Tells Docker the startup order. Kafka `depends_on` Zookeeper because Kafka
can't start without it.

### Volumes
Persist data across container restarts. Without volumes, all data is lost when
the container stops.

## Important Docker Commands

```bash
# Start all services (add -d for background/detached mode)
docker-compose up -d

# See running containers
docker-compose ps

# See logs for a specific service
docker-compose logs kafka
docker-compose logs -f kafka    # -f = follow (live tail)

# Stop all services
docker-compose down

# Stop and DELETE all data (volumes)
docker-compose down -v

# Restart a specific service
docker-compose restart kafka

# Execute a command inside a running container
docker-compose exec kafka bash
```

## Exercise

Create `docker-compose.yml` with 4 services:

1. **postgres** — image `postgres:15`, port 5432, env: POSTGRES_USER,
   POSTGRES_PASSWORD, POSTGRES_DB
2. **redis** — image `redis:7-alpine`, port 6379
3. **zookeeper** — image `confluentinc/cp-zookeeper:7.5.0`, port 2181
4. **kafka** — image `confluentinc/cp-kafka:7.5.0`, port 9092,
   depends_on zookeeper

Kafka environment variables needed:
- `KAFKA_BROKER_ID: 1`
- `KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181`
- `KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092`
- `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1` (since we only have 1 broker)

## Verification

After `docker-compose up -d`, run:
```bash
docker-compose ps          # All 4 should show "Up" or "running"
docker-compose exec redis redis-cli ping    # Should return "PONG"
docker-compose exec postgres psql -U <your_user> -d <your_db> -c "SELECT 1;"
```
