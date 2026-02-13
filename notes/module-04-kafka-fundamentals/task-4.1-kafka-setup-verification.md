# Task 4.1 — Kafka Setup Verification

## Why This Task?

Before writing any Kafka code, you need to understand the Kafka CLI tools and see how topics, partitions, and messages work at the lowest level. This is like learning SQL before using an ORM — you'll understand what the libraries are doing under the hood.

---

## Key Concepts

### What is Kafka?

A **distributed event streaming platform**. Services write events (messages) to **topics**, and other services read from those topics — independently, at their own pace.

```
Producer (ride-service)                     Consumer (notification-service)
     │                                              │
     │  publish("ride-events", event)               │  subscribe("ride-events")
     │                                              │
     ▼                                              ▼
┌──────────────────────────────────────────────────────┐
│                    KAFKA BROKER                      │
│                                                      │
│  Topic: "ride-events"                                │
│  ┌──────────────────────────────────────────┐        │
│  │ Partition 0: [evt1] [evt4] [evt7]        │        │
│  │ Partition 1: [evt2] [evt5] [evt8]        │        │
│  │ Partition 2: [evt3] [evt6] [evt9]        │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  Messages are PERSISTED to disk (not lost on read)   │
└──────────────────────────────────────────────────────┘
```

### Key Terms

| Term | Definition |
|------|-----------|
| **Broker** | A Kafka server. We have 1 broker in Docker. Production systems have 3+. |
| **Topic** | A named stream of events (like a database table for messages). |
| **Partition** | A topic is split into partitions for parallel processing. |
| **Offset** | A sequential ID for each message within a partition. Consumers track this. |
| **Replication Factor** | How many copies of each partition exist (fault tolerance). We use 1 (dev only). |
| **Producer** | Writes messages to a topic. |
| **Consumer** | Reads messages from a topic. |
| **Consumer Group** | Multiple consumers sharing work — each partition assigned to one consumer. |

### Why Partitions Matter

```
Without partitions (1 partition):
  All messages → single queue → single consumer → BOTTLENECK

With 3 partitions:
  Messages spread across 3 queues → 3 consumers in parallel → 3x throughput

Key rule: Messages with the SAME KEY go to the SAME partition
  → ride-123 events always in partition 0 → guaranteed ordering for that ride
  → ride-456 events always in partition 1 → processed independently
```

### Redis Pub/Sub vs Kafka — Side by Side

| Feature | Redis Pub/Sub (Task 3.3) | Kafka (this module) |
|---------|-------------------------|---------------------|
| Storage | None — fire and forget | Persisted to disk |
| Offline consumer | Misses messages | Catches up from last offset |
| Replay | Impossible | Read from any offset |
| Ordering | None | Per-partition ordering |
| Speed | Faster (in-memory only) | Slightly slower (disk writes) |
| Best for | Real-time notifications | Reliable event processing, audit trails |

---

## Kafka CLI Tools (Confluent Image)

On `confluentinc/cp-kafka`, the tools are at `/usr/bin/`:

| Command | Purpose |
|---------|---------|
| `kafka-topics` | Create, list, describe, delete topics |
| `kafka-console-producer` | Send messages from terminal |
| `kafka-console-consumer` | Read messages from terminal |

### Common Flags

- `--bootstrap-server localhost:9092` — which broker to connect to (inside container: `kafka:29092`)
- `--topic <name>` — which topic to operate on
- `--partitions <n>` — number of partitions (on create)
- `--replication-factor <n>` — copies per partition (must be 1 since we have 1 broker)

---

## What We Did

### 1. Verified Kafka is running
```bash
docker ps | grep kafka
```

### 2. Created three topics
```bash
# From inside the kafka container:
kafka-topics --create --topic ride-events --partitions 3 --replication-factor 1 --bootstrap-server kafka:29092
kafka-topics --create --topic location-updates --partitions 3 --replication-factor 1 --bootstrap-server kafka:29092
kafka-topics --create --topic notifications --partitions 1 --replication-factor 1 --bootstrap-server kafka:29092
```

**Why these partition counts?**
- `ride-events` (3 partitions) — high volume, key by rideId for ordering per ride
- `location-updates` (3 partitions) — highest volume (GPS updates every few seconds)
- `notifications` (1 partition) — lower volume, ordering matters across all notifications

### 3. Listed all topics
```bash
kafka-topics --list --bootstrap-server kafka:29092
```

### 4. Described topic details
```bash
kafka-topics --describe --topic ride-events --bootstrap-server kafka:29092
```

---

## Verification Checklist

- [ ] `docker ps` shows kafka container running
- [ ] `kafka-topics --list` shows all 3 topics
- [ ] `kafka-topics --describe` shows correct partition count for each
- [ ] Understand: topic, partition, replication factor, offset
