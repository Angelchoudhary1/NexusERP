import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { signToken, TokenPayload } from '../../utils/jwt.js';

export class AuthService {
  static async login(email: string, password: string) {
    // Find user by email
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rowCount === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = res.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Sign JWT
    const payload: TokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = signToken(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  static async getMe(userId: number) {
    const res = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [userId]);
    if (res.rowCount === 0) {
      throw new UnauthorizedError('User not found');
    }
    return res.rows[0];
  }
}
