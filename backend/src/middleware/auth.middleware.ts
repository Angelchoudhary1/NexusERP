import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { pool } from '../config/db.js';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token malformed');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Verify user still exists in database
    const userRes = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rowCount === 0) {
      throw new UnauthorizedError('User no longer exists');
    }

    // Attach to request
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
