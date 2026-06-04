import http from "http";
import { Socket } from "net";
import app from "./app";
import { Database, redis, logger, ValidationFieldMeta } from "intellisolar-common";

const PORT = process.env["PORT"] || 5000;

const server = http.createServer(app);

const connections: { [key: string]: Socket } = {};

server.on("connection", (conn: Socket) => {
  conn.setNoDelay(true);
  conn.setKeepAlive(true, 60000);

  const key = `${conn.remoteAddress}:${conn.remotePort}`;
  connections[key] = conn;

  conn.on("close", () => {
    delete connections[key];
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await Database.init();
    logger.info("Database initialized successfully");

    try {
      const pingResult = await redis.ping();
      if (pingResult === "PONG") {
        logger.info("Redis connection verified successfully");
      } else {
        logger.warn(`Redis ping returned unexpected result: ${pingResult}`);
      }
    } catch (error: any) {
      logger.error({ err: error }, `Redis connection verification failed: ${error.message}`);
      logger.warn("Server will continue but caching may not work properly");
    }

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env["NODE_ENV"]} mode`);
    });
  } catch (error: any) {
    logger.error("Failed to initialize database:", error);
    process.exit(1);
  }
};

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${PORT} is already in use`);
    gracefulShutdown();
  } else {
    logger.error("Server error:", error as any);
    gracefulShutdown();
  }
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT. Initiating graceful shutdown...");
  gracefulShutdown();
});

function gracefulShutdown() {
  logger.info("Initiating graceful shutdown...");

  server.getConnections((err, count) => {
    if (err) {
      logger.error("Error getting active connections:", err as any);
    } else {
      logger.info(`Active connections: ${count}`);
    }
  });

  for (const key in connections) {
    logger.info(`Destroying connection: ${key}`);
    connections[key]?.destroy();
  }

  server.close(() => {
    logger.info("Server closed");

    redis.quit().catch((error) => {
      logger.error("Error closing Redis connection:", error);
    });

    Database.shutdown()
      .then(() => {
        logger.info("Database connection closed");
        logger.info("Graceful shutdown completed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Error closing database:", error);
        process.exit(1);
      });
  });

  setTimeout(() => {
    logger.error("Forcing server shutdown");
    process.exit(1);
  }, 10000);
}

startServer();

// Enhanced TypeScript types for Express Request
declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        tenant_id: string | null;
        email: string;
        first_name: string;
        last_name: string;
        full_name: string;
        role: string;
        current_session_id: string;
        permissions: string[];
        plant_ids: string[];
      };
      userAgentInfo: {
        browser: string;
        version: string;
        os: string;
        device: string;
        ip: string;
      };
      _validationFieldMeta?: Map<string, ValidationFieldMeta>;
    }
  }
}