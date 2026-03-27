import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { logger } from "../utils/logger";

/**
 * Authentication middleware.
 * Extracts and verifies the Supabase JWT from the Authorization header.
 * Attaches the user to the request object.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
        statusCode: 401,
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn({ error }, "Invalid authentication token");
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid or expired token",
        statusCode: 401,
      });
      return;
    }

    // Attach user and token to request
    (req as any).user = user;
    (req as any).accessToken = token;

    next();
  } catch (error) {
    logger.error({ error }, "Authentication error");
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Authentication failed",
      statusCode: 500,
    });
  }
}
