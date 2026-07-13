import type { Request, Response, NextFunction } from 'express';
import type { Schema } from 'joi';
import { sendError } from '../utils/apiResponse';

export const validate =
  (schema: Schema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => d.message);
      sendError(res, 'Validation failed', 422, errors);
      return;
    }
    next();
  };
