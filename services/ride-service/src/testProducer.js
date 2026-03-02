import { connectProducer, disconnectProducer, producer } from './kafka.js';

const TOPIC = 'ride-events';
const MESSAGE_COUNT = 10;

// Reused keys are intentional:
// same key -> same partition -> ordering for that key.
const RIDE_IDS = ['ride-101', 'ride-202', 'ride-303'];

function buildRideEvent(index) {
  const rideId = RIDE_IDS[index % RIDE_IDS.length];

  return {
    eventType: 'RIDE_REQUESTED',
    rideId,
    riderId: `rider-${(index % 5) + 1}`,
    pickup: {
      lat: 12.97 + index * 0.001,
      lng: 77.59 + index * 0.001,
    },
    createdAt: new Date().toISOString(),
    sequence: index + 1,
  };
}

function buildMessage(index) {
  const event = buildRideEvent(index);

  return {
    // Kafka uses key hashing for partition selection.
    key: event.rideId,

    // Value is sent as bytes/string; JSON is the common event format.
    value: JSON.stringify(event),

    // Optional metadata that consumers can inspect.
    headers: {
      source: 'ride-service',
      eventType: event.eventType,
    },
  };
}

function createMessages(count = MESSAGE_COUNT) {
  return Array.from({ length: count }, (_, index) => buildMessage(index));
}

// Shared shutdown path for Ctrl+C / SIGTERM / unexpected failures.
async function shutdown(exitCode = 0) {
  try {
    await disconnectProducer();
  } finally {
    if (typeof exitCode === 'number') process.exit(exitCode);
  }
}

const run = async () => {
  const messages = createMessages();

  try {
    await connectProducer();
    console.log(`[producer] Connected. Sending ${messages.length} messages to "${TOPIC}"...`);

    // Send all 10 messages in one batch request.
    const result = await producer.send({
      topic: TOPIC,
      messages,
    });

    console.log('[producer] Send metadata:', result);

    messages.forEach((message, index) => {
      console.log(`[producer] #${index + 1} key=${message.key} value=${message.value}`);
    });
  } catch (error) {
    console.error('[producer] Failed to send messages:', error);
    process.exitCode = 1;
  } finally {
    // Always disconnect so buffered messages are flushed cleanly.
    await disconnectProducer();
    console.log('[producer] Disconnected cleanly.');
  }
};

// Handle manual stop (`Ctrl+C`) and container stop gracefully.
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.once(signal, async () => {
    await shutdown(0);
  });
});

// Top-level catch prevents silent exits on unexpected async failures.
run().catch(async (error) => {
  console.error('[producer] Unexpected error:', error);
  await shutdown(1);
});
