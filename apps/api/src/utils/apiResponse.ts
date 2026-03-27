import { Response } from "express";

/**
 * Standardized API response helpers.
 */
export class ApiResponse {
  /**
   * Send a successful response.
   */
  static success<T>(res: Response, data: T, message?: string, statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      data,
      ...(message ? { message } : {}),
    });
  }

  /**
   * Send a successful response with pagination info.
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: { page: number; limit: number; total: number }
  ) {
    res.status(200).json({
      success: true,
      data,
      pagination: {
        ...pagination,
        total_pages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  }

  /**
   * Send a created response (201).
   */
  static created<T>(res: Response, data: T, message?: string) {
    ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send an error response.
   */
  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errorType = "Internal Server Error"
  ) {
    res.status(statusCode).json({
      success: false,
      error: errorType,
      message,
      statusCode,
    });
  }

  /**
   * Send a not found response (404).
   */
  static notFound(res: Response, message = "Resource not found") {
    ApiResponse.error(res, message, 404, "Not Found");
  }

  /**
   * Send a bad request response (400).
   */
  static badRequest(res: Response, message: string) {
    ApiResponse.error(res, message, 400, "Bad Request");
  }
}
