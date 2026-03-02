import { Kafka, Partitioners } from 'kafkajs';

const CLIENT_ID = 'ride-service';
const DEFAULT_BROKERS = 'localhost:9092';

// Allow multiple brokers via env (comma-separated). Local default works with docker-compose.
const brokers = (process.env.KAFKA_BROKERS ?? DEFAULT_BROKERS)
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

export const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers,
});

// Explicit partitioner avoids KafkaJS v2 warning and makes behavior obvious.
export const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
});

let connected = false;

// Safe to call multiple times; only connects once.
export const connectProducer = async () => {
  if (connected) return;
  await producer.connect();
  connected = true;
};

// Safe to call multiple times; only disconnects when connected.
export const disconnectProducer = async () => {
  if (!connected) return;
  await producer.disconnect();
  connected = false;
};
