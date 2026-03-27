import cors from "cors";
import { env } from "./env";

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow Chrome extension origins
    if (origin.startsWith("chrome-extension://")) {
      callback(null, true);
      return;
    }

    // Check against configured origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
