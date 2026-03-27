import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      service: "LinkVault API",
      version: "1.0.0",
      apiVersion: "v1",
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
