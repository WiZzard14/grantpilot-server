import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        field: issue.path.filter((part) => part !== "body").join("."),
        message: issue.message
      }));
      const first = issues[0];
      const message = first?.field ? `${first.field}: ${first.message}` : first?.message || "Validation failed";
      return next(new AppError(message, 422, { issues }));
    }

    const parsed = result.data as { body?: unknown; query?: unknown; params?: unknown };
    if (parsed.body !== undefined) req.body = parsed.body;
    next();
  };
}
