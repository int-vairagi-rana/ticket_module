import { Queue } from "bullmq";

export const firebaseNotificationQueue = new Queue(
  process.env["FIREBASE_QUEUE_NAME"] || "firebase-notifications",
  {
    connection: {
      host: process.env["REDIS_HOST"] || "localhost",
      port: parseInt(process.env["REDIS_PORT"] || "6379", 10),
      password: process.env["REDIS_PASSWORD"],
    },
  }
);