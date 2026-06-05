import express, { json, urlencoded } from "express";
import type { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import { errorHandler, rateLimiter, logger } from "intellisolar-common";
import helmet from "helmet";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import useragent from "useragent";
import router from "./routes";

// Initialize express app
const app = express();

// Environment-based configuration
const isProduction = process.env["NODE_ENV"] === "production";

// Morgan logging setup
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
    skip: () => !isProduction,
  })
);

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(hpp());
app.use(cookieParser());

// User-Agent and IP middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const agent = useragent.parse(req.get("user-agent") || "");
  const clientIp =
    req.get("x-forwarded-for") || req.socket.remoteAddress || "unknown";

  req.userAgentInfo = {
    browser: agent.family,
    version: agent.toVersion(),
    os: agent.os.toString(),
    device: agent.device.toString(),
    ip: clientIp,
  };
  next();
});

// Request parsing middleware
app.use(json({ limit: "50mb" }));
app.use(urlencoded({ extended: true, limit: "50mb" }));

// Compression middleware
app.use(compression());

// CORS configuration
const corsOrigins = [
  "http://localhost:5173",
  "http://192.168.0.68:5173",
  ...(process.env["CORS_ORIGIN"] ? [process.env["CORS_ORIGIN"]] : [])
];

const allowedOrigins = [...new Set(corsOrigins.filter(Boolean))];

logger.info(`CORS allowed origins: ${JSON.stringify(allowedOrigins)}`);
logger.info(`CORS_ORIGIN env var: ${process.env["CORS_ORIGIN"] || 'not set'}`);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400
  })
);

// Rate limiting
app.use(rateLimiter());

// Request timeout
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(15000, () => {
    logger.error(`Request timeout for ${req.method} ${req.url}`);
    res.status(504).json({ error: "Request timeout" });
  });
  next();
});

// API routes
app.use("/api", router);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

export default app;
