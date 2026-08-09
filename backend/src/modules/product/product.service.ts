import { pool } from '../../config/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export interface ProductData {
  product_name: string;
  sku: string;
  category: string;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  location?: string | null;
}

export class ProductService {
  static async list(params: {
    search?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    const { search, category, limit = 10, offset = 0 } = params;
    const values: any[] = [];
    const conditions: string[] = ["is_active = TRUE"]; // default list active only

    let countQuery = 'SELECT COUNT(*) FROM products';
    let queryText = `
      SELECT p.*, u.name as created_by_name 
      FROM products p
      LEFT JOIN users u ON p.created_by = u.id
    `;

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(p.product_name ILIKE $${values.length} OR p.sku ILIKE $${values.length})`);
    }

    if (category) {
      values.push(category);
      conditions.push(`p.category = $${values.length}`);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      queryText += whereClause;
      countQuery += whereClause;
    }

    queryText += ` ORDER BY p.product_name ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const queryParams = [...values, limit, offset];

    const [dataRes, countRes] = await Promise.all([
      pool.query(queryText, queryParams),
      pool.query(countQuery, values)
    ]);

    return {
      products: dataRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
      limit,
      offset
    };
  }

  static async getById(id: number) {
    const res = await pool.query(`
      SELECT p.*, u.name as created_by_name 
      FROM products p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `, [id]);

    if (res.rowCount === 0) {
      throw new NotFoundError('Product not found');
    }

    return res.rows[0];
  }

  static async create(data: ProductData, userId: number) {
    const { product_name, sku, category, unit_price, current_stock, min_stock_alert, location } = data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert product
      const res = await client.query(`
        INSERT INTO products (
          product_name, sku, category, unit_price, current_stock, min_stock_alert, location, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        product_name,
        sku.toUpperCase(),
        category,
        unit_price,
        current_stock,
        min_stock_alert,
        location || null,
        userId
      ]);

      const product = res.rows[0];

      // 2. If current stock > 0, log stock movement
      if (current_stock > 0) {
        await client.query(`
          INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
          VALUES ($1, $2, 'IN', 'Initial Stock Upload', $3)
        `, [product.id, current_stock, userId]);
      }

      await client.query('COMMIT');
      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id: number, data: Partial<ProductData & { is_active?: boolean }>) {
    const checkRes = await pool.query('SELECT 1 FROM products WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      throw new NotFoundError('Product not found');
    }

    const setClauses: string[] = [];
    const values: any[] = [id];

    Object.entries(data).forEach(([key, val]) => {
      const validFields = ['product_name', 'sku', 'category', 'unit_price', 'min_stock_alert', 'location', 'is_active'];
      if (validFields.includes(key)) {
        values.push(key === 'sku' && typeof val === 'string' ? val.toUpperCase() : (val === '' ? null : val));
        setClauses.push(`${key} = $${values.length}`);
      }
    });

    if (setClauses.length === 0) {
      const getRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      return getRes.rows[0];
    }

    const queryText = `
      UPDATE products 
      SET ${setClauses.join(', ')} 
      WHERE id = $1 
      RETURNING *
    `;

    const res = await pool.query(queryText, values);
    return res.rows[0];
  }

  static async adjustStock(id: number, type: 'IN' | 'OUT', qty: number, reason: string, userId: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch current product details with lock (SELECT FOR UPDATE)
      const res = await client.query('SELECT current_stock, product_name FROM products WHERE id = $1 FOR UPDATE', [id]);
      if (res.rowCount === 0) {
        throw new NotFoundError('Product not found');
      }

      const product = res.rows[0];
      let newStock = product.current_stock;

      if (type === 'IN') {
        newStock += qty;
      } else {
        newStock -= qty;
        if (newStock < 0) {
          throw new BadRequestError(`Insufficient stock. Current available stock: ${product.current_stock}`);
        }
      }

      // 2. Update stock
      const updateRes = await client.query(`
        UPDATE products 
        SET current_stock = $1 
        WHERE id = $2 
        RETURNING *
      `, [newStock, id]);

      // 3. Log movement
      await client.query(`
        INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, qty, type, reason, userId]);

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getMovements(productId: number) {
    // Verify product exists
    const checkRes = await pool.query('SELECT 1 FROM products WHERE id = $1', [productId]);
    if (checkRes.rowCount === 0) {
      throw new NotFoundError('Product not found');
    }

    const res = await pool.query(`
      SELECT sm.*, u.name as created_by_name 
      FROM stock_movements sm
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.product_id = $1
      ORDER BY sm.created_at DESC
    `, [productId]);

    return res.rows;
  }
}
