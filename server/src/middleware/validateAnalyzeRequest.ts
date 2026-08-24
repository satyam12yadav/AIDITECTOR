import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './errorHandler.js';

const analyzeSchema = z
  .object({
    url: z.string().trim().min(1, 'URL cannot be empty').optional(),
    text: z.string().trim().min(1, 'Text content cannot be empty').optional(),
  })
  .refine(
    (data) => {
      const hasUrl = typeof data.url === 'string' && data.url.trim().length > 0;
      const hasText = typeof data.text === 'string' && data.text.trim().length > 0;
      return hasUrl || hasText;
    },
    {
      message: "At least one of 'url' or 'text' must be provided.",
      path: ['input'],
    }
  );

export const validateAnalyzeRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.body || typeof req.body !== 'object') {
    throw new AppError(
      "Request body must be a valid JSON object containing 'url' or 'text'.",
      400,
      'INVALID_REQUEST_BODY'
    );
  }

  const result = analyzeSchema.safeParse(req.body);

  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join('; ');
    throw new AppError(
      `Validation failed: ${errorMessages}`,
      400,
      'VALIDATION_ERROR',
      result.error.flatten()
    );
  }

  // Attach sanitized / validated values to body
  req.body = result.data;
  next();
};
