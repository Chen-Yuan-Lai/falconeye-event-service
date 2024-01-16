import { EventEmitter } from 'events';
import { Kafka } from 'kafkajs';

const messageEmitter = new EventEmitter();

const brokers = [process.env.KAFKA_BROKER];
const kafka = new Kafka({
  clientId: 'eventProcess-service',
  brokers,
  retry: {
    initialRetryTime: 500, // Initial delay between retries in milliseconds
    retries: Infinity, // Set retries to Infinity for indefinite retries
    factor: 2, // Exponential factor by which the retry time will be increased
    multiplier: 1.5, // Multiplier to calculate retry delay
    maxRetryTime: 60000, // Maximum wait time for a retry in milliseconds
  },
});

const consumer = kafka.consumer({
  groupId: 'eventProcess-service',
});

export const connectConsumer = async topic => {
  await consumer.connect();
  console.log('Consumer connected');

  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message || !message.value) return;

      const data = JSON.parse(message.value.toString());
      messageEmitter.emit('eventData', data);
    },
  });

  return messageEmitter;
};

export const disconnectConsumer = async () => {
  await consumer.disconnect();
  console.log('Consumer disconnected');
};
