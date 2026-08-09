import { pool } from '../../config/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export interface ChallanItemData {
  product_id: number;
  quantity: number;
}

export interface ChallanData {
  customer_id: number;
  status: 'DRAFT' | 'CONFIRMED';
  items: ChallanItemData[];
}

export class ChallanService {
  static async list(params: {
    status?: string;
    customerId?: number;
    limit?: number;
    offset?: number;
  }) {
    const { status, customerId, limit = 10, offset = 0 } = params;
    const values: any[] = [];
    const conditions: string[] = [];

    let countQuery = 'SELECT COUNT(*) FROM challans';
    let queryText = `
      SELECT ch.*, c.customer_name, c.business_name, u.name as created_by_name 
      FROM challans ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      LEFT JOIN users u ON ch.created_by = u.id
    `;

    if (status) {
      values.push(status.toUpperCase());
      conditions.push(`ch.status = $${values.length}`);
    }

    if (customerId) {
      values.push(customerId);
      conditions.push(`ch.customer_id = $${values.length}`);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      queryText += whereClause;
      countQuery += whereClause;
    }

    queryText += ` ORDER BY ch.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const queryParams = [...values, limit, offset];

    const [dataRes, countRes] = await Promise.all([
      pool.query(queryText, queryParams),
      pool.query(countQuery, values)
    ]);

    return {
      challans: dataRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
      limit,
      offset
    };
  }

  static async getById(id: number) {
    const challanRes = await pool.query(`
      SELECT ch.*, c.customer_name, c.mobile, c.email, c.business_name, c.gst_number, c.address, u.name as created_by_name 
      FROM challans ch
      LEFT JOIN customers c ON ch.customer_id = c.id
      LEFT JOIN users u ON ch.created_by = u.id
      WHERE ch.id = $1
    `, [id]);

    if (challanRes.rowCount === 0) {
      throw new NotFoundError('Challan not found');
    }

    const itemsRes = await pool.query(`
      SELECT ci.*, p.category, p.location
      FROM challan_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.challan_id = $1
    `, [id]);

    return {
      ...challanRes.rows[0],
      items: itemsRes.rows
    };
  }

  static async create(data: ChallanData, userId: number) {
    const { customer_id, status = 'DRAFT', items } = data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify customer exists
      const custCheck = await client.query('SELECT 1 FROM customers WHERE id = $1', [customer_id]);
      if (custCheck.rowCount === 0) {
        throw new BadRequestError('Invalid customer ID');
      }

      // 2. Generate Challan Number
      const currentYear = new Date().getFullYear();
      const prefix = `CH-${currentYear}-`;
      const seqRes = await client.query(`
        SELECT MAX(SUBSTRING(challan_number FROM ${prefix.length + 1})) as max_seq 
        FROM challans 
        WHERE challan_number LIKE $1
      `, [`${prefix}%`]);
      
      let nextSeq = 1;
      if (seqRes.rows[0] && seqRes.rows[0].max_seq) {
        nextSeq = parseInt(seqRes.rows[0].max_seq, 10) + 1;
      }
      const challanNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

      // 3. Process items and snap details
      const snappedItems: any[] = [];
      let totalQty = 0;

      for (const item of items) {
        const prodRes = await client.query(
          'SELECT id, product_name, sku, unit_price, current_stock, is_active FROM products WHERE id = $1',
          [item.product_id]
        );

        if (prodRes.rowCount === 0) {
          throw new BadRequestError(`Product with ID ${item.product_id} not found`);
        }

        const product = prodRes.rows[0];
        if (!product.is_active) {
          throw new BadRequestError(`Product ${product.product_name} is inactive and cannot be sold`);
        }

        snappedItems.push({
          product_id: product.id,
          product_name: product.product_name,
          sku: product.sku,
          unit_price: product.unit_price,
          quantity: item.quantity,
          current_stock: product.current_stock
        });

        totalQty += item.quantity;
      }

      // 4. If status is CONFIRMED, perform stock reduction & validation
      if (status === 'CONFIRMED') {
        for (const item of snappedItems) {
          // SELECT FOR UPDATE to lock product rows and avoid race conditions
          const lockRes = await client.query(
            'SELECT current_stock, product_name FROM products WHERE id = $1 FOR UPDATE',
            [item.product_id]
          );
          const currentStock = lockRes.rows[0].current_stock;

          if (currentStock < item.quantity) {
            throw new BadRequestError(
              `Insufficient stock for "${item.product_name}". Available: ${currentStock}, Requested: ${item.quantity}`
            );
          }

          // Deduct stock
          await client.query(
            'UPDATE products SET current_stock = current_stock - $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );

          // Log stock movement OUT
          await client.query(`
            INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
            VALUES ($1, $2, 'OUT', 'Sales Challan ${challanNumber} Confirmed', $3)
          `, [item.product_id, item.quantity, userId]);
        }
      }

      // 5. Create Challan record
      const challanRes = await client.query(`
        INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [challanNumber, customer_id, totalQty, status, userId]);

      const challanId = challanRes.rows[0].id;

      // 6. Insert Challan items
      for (const item of snappedItems) {
        await client.query(`
          INSERT INTO challan_items (challan_id, product_id, product_name, sku, unit_price, quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [challanId, item.product_id, item.product_name, item.sku, item.unit_price, item.quantity]);
      }

      await client.query('COMMIT');
      return {
        ...challanRes.rows[0],
        items: snappedItems
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id: number, data: Partial<Omit<ChallanData, 'status'> & { status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' }>, userId: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch current Challan details with lock
      const challanCheck = await client.query('SELECT * FROM challans WHERE id = $1 FOR UPDATE', [id]);
      if (challanCheck.rowCount === 0) {
        throw new NotFoundError('Challan not found');
      }

      const currentChallan = challanCheck.rows[0];

      // 2. Enforce Status Rules
      if (currentChallan.status === 'CANCELLED') {
        throw new BadRequestError('Cannot modify a cancelled challan');
      }

      if (currentChallan.status === 'CONFIRMED') {
        // Confirmed challans can only be transitioned to CANCELLED
        if (data.status && data.status !== 'CANCELLED') {
          throw new BadRequestError('A confirmed challan can only be changed to CANCELLED status');
        }
        if (data.customer_id || data.items) {
          throw new BadRequestError('Cannot modify details (customer, items) of a confirmed challan');
        }

        // Cancel the Confirmed Challan (Revert Stock)
        if (data.status === 'CANCELLED') {
          const itemsRes = await client.query('SELECT product_id, quantity FROM challan_items WHERE challan_id = $1', [id]);
          
          for (const item of itemsRes.rows) {
            // Lock product row
            await client.query('SELECT 1 FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
            // Revert stock
            await client.query('UPDATE products SET current_stock = current_stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
            // Log stock movement IN
            await client.query(`
              INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
              VALUES ($1, $2, 'IN', 'Sales Challan ${currentChallan.challan_number} Cancelled', $3)
            `, [item.product_id, item.quantity, userId]);
          }

          // Update Challan Status
          const updateRes = await client.query('UPDATE challans SET status = \'CANCELLED\' WHERE id = $1 RETURNING *', [id]);
          await client.query('COMMIT');
          return updateRes.rows[0];
        }
      }

      // If current status is DRAFT, we can update items, customer, and transition status
      if (currentChallan.status === 'DRAFT') {
        let newStatus = data.status || currentChallan.status;
        let newCustomerId = data.customer_id || currentChallan.customer_id;
        let updatedItems = data.items;

        // If items are being updated, we need to replace the challan items snapshot
        let totalQty = currentChallan.total_quantity;
        let finalItems: any[] = [];

        if (updatedItems) {
          // Delete old items
          await client.query('DELETE FROM challan_items WHERE challan_id = $1', [id]);

          totalQty = 0;
          for (const item of updatedItems) {
            const prodRes = await client.query(
              'SELECT id, product_name, sku, unit_price, current_stock, is_active FROM products WHERE id = $1',
              [item.product_id]
            );

            if (prodRes.rowCount === 0) {
              throw new BadRequestError(`Product with ID ${item.product_id} not found`);
            }

            const product = prodRes.rows[0];
            if (!product.is_active) {
              throw new BadRequestError(`Product ${product.product_name} is inactive and cannot be sold`);
            }

            finalItems.push({
              product_id: product.id,
              product_name: product.product_name,
              sku: product.sku,
              unit_price: product.unit_price,
              quantity: item.quantity,
              current_stock: product.current_stock
            });

            totalQty += item.quantity;
          }

          // Re-insert new items
          for (const item of finalItems) {
            await client.query(`
              INSERT INTO challan_items (challan_id, product_id, product_name, sku, unit_price, quantity)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [id, item.product_id, item.product_name, item.sku, item.unit_price, item.quantity]);
          }
        } else {
          // Fetch existing items for stock deduction if status changes to CONFIRMED
          const existingRes = await client.query('SELECT * FROM challan_items WHERE challan_id = $1', [id]);
          finalItems = existingRes.rows;
        }

        // If transitioning from DRAFT to CONFIRMED, perform stock reduction & validation
        if (newStatus === 'CONFIRMED') {
          for (const item of finalItems) {
            const lockRes = await client.query(
              'SELECT current_stock, product_name FROM products WHERE id = $1 FOR UPDATE',
              [item.product_id]
            );
            const currentStock = lockRes.rows[0].current_stock;

            if (currentStock < item.quantity) {
              throw new BadRequestError(
                `Insufficient stock for "${item.product_name}". Available: ${currentStock}, Requested: ${item.quantity}`
              );
            }

            // Deduct stock
            await client.query(
              'UPDATE products SET current_stock = current_stock - $1 WHERE id = $2',
              [item.quantity, item.product_id]
            );

            // Log stock movement OUT
            await client.query(`
              INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
              VALUES ($1, $2, 'OUT', 'Sales Challan ${currentChallan.challan_number} Confirmed', $3)
            `, [item.product_id, item.quantity, userId]);
          }
        }

        // Update Challan details
        const updateRes = await client.query(`
          UPDATE challans
          SET customer_id = $1, total_quantity = $2, status = $3
          WHERE id = $4
          RETURNING *
        `, [newCustomerId, totalQty, newStatus, id]);

        await client.query('COMMIT');
        return {
          ...updateRes.rows[0],
          items: finalItems
        };
      }

      await client.query('COMMIT');
      return currentChallan;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
