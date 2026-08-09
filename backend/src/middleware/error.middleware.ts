import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Something went wrong';

  // 1. Handle Custom Operational AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // 2. Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    const formattedErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    message = `Validation Error: ${formattedErrors}`;
  }
  // 3. Handle Database Errors (pg)
  else if (err.code) {
    switch (err.code) {
      case '23505': // Duplicate key
        statusCode = 409;
        if (err.detail && err.detail.includes('email')) {
          message = 'Email address already exists';
        } else if (err.detail && err.detail.includes('sku')) {
          message = 'Product SKU already exists';
        } else if (err.detail && err.detail.includes('challan_number')) {
          message = 'Challan number already exists';
        } else {
          message = 'Duplicate record found';
        }
        break;
      case '23503': // Foreign key violation
        statusCode = 409;
        message = 'Cannot modify or delete resource because it is referenced elsewhere';
        break;
      case '22P02': // Invalid text representation
        statusCode = 400;
        message = 'Invalid input format (e.g. invalid ID type)';
        break;
      default:
        console.error('Database error code:', err.code, err.message);
        message = 'Database operation failed';
    }
  }
  // 4. Handle JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }
  // 5. Unhandled Generic Error
  else {
    console.error('Unhandled Server Error:', err);
    message = process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong';
  }

  // Ensure we don't send details in production unless operational
  res.status(statusCode).json({
    success: false,
    message
  });
};
