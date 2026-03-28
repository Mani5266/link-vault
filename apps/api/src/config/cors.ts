import cors from "cors";
import { env } from "./env";
import { logger } from "../utils/logger";

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
logger.info({ allowedOrigins }, "CORS allowed origins configured");

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps)
    // Note: `null` origin is rejected — only truly absent origins pass
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow Chrome extension origins — pin to known extension ID if configured
    if (origin.startsWith("chrome-extension://")) {
      const extensionId = process.env.CHROME_EXTENSION_ID;
      if (extensionId && origin !== `chrome-extension://${extensionId}`) {
        callback(null, false);
        return;
      }
      callback(null, true);
      return;
    }

    // Check against configured origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Reject — don't throw an Error (which causes 500), just deny CORS headers
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
