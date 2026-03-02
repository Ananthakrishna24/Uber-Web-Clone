# Task 4.2 — Your First Kafka Producer

## Why This Task?

In Task 4.1 you created topics using the Kafka CLI. Now you'll write **Node.js code** that sends messages to those topics. This is the producer side — the service that generates events.

In a real Uber system, producers are everywhere:
- Ride-service produces `RIDE_REQUESTED`, `RIDE_ACCEPTED`, `RIDE_COMPLETED` events
- Location-service produces `LOCATION_UPDATED` events (every few seconds per driver)
- These events are consumed by other services asynchronously

---

## Key Concepts

### What is a Kafka Producer?

A producer is code that **sends messages to a Kafka topic**. That's it. It doesn't care who reads them or when.

```
Your Code (Producer)          Kafka Broker              Consumer (later)
     │                            │                          │
     │  send({                    │                          │
     │    topic: "ride-events",   │                          │
     │    messages: [{            │                          │
     │      key: "ride-123",  ────┼──► Partition 1: [msg]    │
     │      value: "{...json}"    │                    │     │
     │    }]                      │                    └─────┼──► reads later
     │  })                        │                          │
```

### Kafka Message Structure

Every Kafka message has three parts:

```
┌─────────────────────────────────────────────┐
│ KAFKA MESSAGE                               │
│                                             │
│  key:     "ride-abc-123"                    │  ← Determines which PARTITION
│                                             │     (same key = same partition = ordering)
│  value:   '{"eventType":"RIDE_REQUESTED"}'  │  ← The actual data (usually JSON string)
│                                             │
│  headers: { source: "ride-service" }        │  ← Optional metadata (like HTTP headers)
│                                             │
└─────────────────────────────────────────────┘
```

**Why the key matters:**
- Kafka hashes the key to decide which partition to send to
- Same key → same partition → **guaranteed ordering** for that key
- For rides: key = rideId → all events for one ride stay in order
- If key is null → round-robin across partitions (no ordering guarantee)

### kafkajs — The Node.js Kafka Client

`kafkajs` is the most popular Kafka client for Node.js. It's pure JavaScript (no native dependencies).

**Core objects:**
```
const kafka = new Kafka({ brokers: ['localhost:9092'] })  ← connection config
const producer = kafka.producer()                          ← creates a producer instance
await producer.connect()                                   ← opens connection to broker
await producer.send({ topic, messages })                   ← sends messages
await producer.disconnect()                                ← clean shutdown
```

### Producer Lifecycle

```
1. CREATE    →  kafka.producer()       (instance in memory)
2. CONNECT   →  producer.connect()     (TCP connection to broker)
3. SEND      →  producer.send({...})   (can call many times)
4. DISCONNECT → producer.disconnect()  (clean shutdown — flushes pending messages)

IMPORTANT: Always disconnect on shutdown (SIGTERM/SIGINT).
If you don't, messages in the send buffer might be lost.
```

---

## Exercise

### Step 1: Install kafkajs in ride-service
```bash
cd services/ride-service && npm install kafkajs
```

### Step 2: Create a Kafka client module
Create `services/ride-service/src/kafka.js` that:
- Imports `Kafka` from kafkajs
- Creates a Kafka instance with broker at `localhost:9092`
- Creates and exports a producer

### Step 3: Create a test producer script
Create `services/ride-service/src/testProducer.js` that:
- Connects the producer
- Sends 10 messages to `ride-events` topic
- Each message has a key (rideId) and a JSON value
- Mix of 3 different rideIds so you can see partition assignment
- Disconnects when done

### Step 4: Verify with kafka-console-consumer
Run a console consumer in the Kafka container to see the messages arrive:
```bash
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic ride-events \
  --from-beginning \
  --property print.key=true \
  --property key.separator=" | "
```

---

## Verification Checklist

- [ ] `kafkajs` installed in ride-service
- [ ] `src/kafka.js` creates Kafka client and exports producer
- [ ] `src/testProducer.js` sends 10 messages with different keys
- [ ] Console consumer shows all 10 messages
- [ ] Messages with the same key appear in the same partition
- [ ] Producer disconnects cleanly (no hanging process)
