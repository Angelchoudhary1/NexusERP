import { pool } from '../../config/db.js';
import { NotFoundError } from '../../utils/errors.js';

export interface CustomerData {
  customer_name: string;
  mobile: string;
  email?: string | null;
  business_name?: string | null;
  gst_number?: string | null;
  customer_type: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address?: string | null;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  follow_up_date?: string | null;
  notes?: string | null;
}

export class CustomerService {
  static async list(params: {
    search?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { search, type, status, limit = 10, offset = 0 } = params;
    const values: any[] = [];
    const conditions: string[] = [];

    let countQuery = 'SELECT COUNT(*) FROM customers';
    let queryText = `
      SELECT c.*, u.name as created_by_name 
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
    `;

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(
        c.customer_name ILIKE $${values.length} OR 
        c.mobile ILIKE $${values.length} OR 
        c.email ILIKE $${values.length} OR 
        c.business_name ILIKE $${values.length}
      )`);
    }

    if (type) {
      values.push(type.toUpperCase());
      conditions.push(`c.customer_type = $${values.length}`);
    }

    if (status) {
      values.push(status.toUpperCase());
      conditions.push(`c.status = $${values.length}`);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      queryText += whereClause;
      countQuery += whereClause;
    }

    // Add pagination and sorting
    queryText += ` ORDER BY c.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const queryParams = [...values, limit, offset];

    const [dataRes, countRes] = await Promise.all([
      pool.query(queryText, queryParams),
      pool.query(countQuery, values)
    ]);

    return {
      customers: dataRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
      limit,
      offset
    };
  }

  static async getById(id: number) {
    const customerRes = await pool.query(`
      SELECT c.*, u.name as created_by_name 
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `, [id]);

    if (customerRes.rowCount === 0) {
      throw new NotFoundError('Customer not found');
    }

    const followUpsRes = await pool.query(`
      SELECT f.*, u.name as created_by_name 
      FROM follow_ups f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.customer_id = $1
      ORDER BY f.created_at DESC
    `, [id]);

    return {
      ...customerRes.rows[0],
      follow_ups: followUpsRes.rows
    };
  }

  static async create(data: CustomerData, userId: number) {
    const {
      customer_name,
      mobile,
      email,
      business_name,
      gst_number,
      customer_type,
      address,
      status,
      follow_up_date,
      notes
    } = data;

    const res = await pool.query(`
      INSERT INTO customers (
        customer_name, mobile, email, business_name, gst_number, 
        customer_type, address, status, follow_up_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      customer_name,
      mobile,
      email || null,
      business_name || null,
      gst_number || null,
      customer_type,
      address || null,
      status || 'LEAD',
      follow_up_date || null,
      notes || null,
      userId
    ]);

    // If there is notes or follow_up_date when creating, also log it as the first follow-up note
    if (notes && follow_up_date) {
      await pool.query(`
        INSERT INTO follow_ups (customer_id, note, follow_up_date, created_by)
        VALUES ($1, $2, $3, $4)
      `, [res.rows[0].id, notes, follow_up_date, userId]);
    }

    return res.rows[0];
  }

  static async update(id: number, data: Partial<CustomerData>) {
    // Check if customer exists
    const checkRes = await pool.query('SELECT 1 FROM customers WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      throw new NotFoundError('Customer not found');
    }

    const setClauses: string[] = [];
    const values: any[] = [id];

    // dynamically construct update fields
    Object.entries(data).forEach(([key, val]) => {
      // Avoid injection and filter valid keys
      const validFields = [
        'customer_name', 'mobile', 'email', 'business_name', 
        'gst_number', 'customer_type', 'address', 'status', 
        'follow_up_date', 'notes'
      ];
      if (validFields.includes(key)) {
        values.push(val === '' ? null : val);
        setClauses.push(`${key} = $${values.length}`);
      }
    });

    if (setClauses.length === 0) {
      const getRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
      return getRes.rows[0];
    }

    const queryText = `
      UPDATE customers 
      SET ${setClauses.join(', ')} 
      WHERE id = $1 
      RETURNING *
    `;

    const res = await pool.query(queryText, values);
    return res.rows[0];
  }

  static async addFollowUp(id: number, note: string, followUpDate: string, userId: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check customer exists
      const checkRes = await client.query('SELECT 1 FROM customers WHERE id = $1', [id]);
      if (checkRes.rowCount === 0) {
        throw new NotFoundError('Customer not found');
      }

      // 1. Insert follow-up record
      const followUpRes = await client.query(`
        INSERT INTO follow_ups (customer_id, note, follow_up_date, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [id, note, followUpDate, userId]);

      // 2. Update customer record with latest follow-up date and notes
      await client.query(`
        UPDATE customers
        SET follow_up_date = $1, notes = $2
        WHERE id = $3
      `, [followUpDate, note, id]);

      await client.query('COMMIT');
      return followUpRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
