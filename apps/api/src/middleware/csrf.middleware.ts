import { Request, Response, NextFunction } from "express";

/**
 * CSRF protection middleware.
 * Validates that non-GET requests include the X-Requested-With header.
 * This prevents cross-origin form submissions (CSRF) because custom
 * headers cannot be set by simple form submissions or cross-origin
 * requests without CORS preflight approval.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Only enforce on state-changing methods
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const xRequestedWith = req.headers["x-requested-with"];

  // Chrome extension may not send this header — check origin instead
  const origin = req.headers.origin || "";
  if (origin.startsWith("chrome-extension://")) {
    return next();
  }

  if (xRequestedWith !== "XMLHttpRequest") {
    res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Missing required security header",
      statusCode: 403,
    });
    return;
  }

  next();
}
