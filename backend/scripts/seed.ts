import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const seedDatabase = async () => {
  try {
    console.log('Seeding Database...');

    // 1. Seed Users
    console.log('Inserting users...');
    const adminPass = await bcrypt.hash('Admin@123', 10);
    const salesPass = await bcrypt.hash('Sales@123', 10);
    const warehousePass = await bcrypt.hash('Warehouse@123', 10);
    const accountsPass = await bcrypt.hash('Accounts@123', 10);

    const userRes = await pool.query(`
      INSERT INTO users (name, email, password, role) VALUES
      ('ERP Admin', 'admin@example.com', $1, 'ADMIN'),
      ('Sales Exec', 'sales@example.com', $2, 'SALES'),
      ('Warehouse Keeper', 'warehouse@example.com', $3, 'WAREHOUSE'),
      ('Accounts Clerk', 'accounts@example.com', $4, 'ACCOUNTS')
      RETURNING id, role;
    `, [adminPass, salesPass, warehousePass, accountsPass]);

    const users = userRes.rows;
    const adminId = users.find(u => u.role === 'ADMIN').id;
    const salesId = users.find(u => u.role === 'SALES').id;
    const warehouseId = users.find(u => u.role === 'WAREHOUSE').id;

    // 2. Seed Customers
    console.log('Inserting customers...');
    const customerRes = await pool.query(`
      INSERT INTO customers (customer_name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by) VALUES
      ('Rahul Sharma', '9876543210', 'rahul@sharmatech.com', 'Sharma Tech Solutions', '07AAAAA1111A1Z1', 'WHOLESALE', '123 Tech Park, Sector 62, Noida', 'ACTIVE', '2026-08-15', 'Interested in bulk laptop bags purchase.', $1),
      ('Amit Patel', '9812345678', 'amit@pateldistributors.com', 'Patel Distributors', '24BBBBB2222B2Z2', 'DISTRIBUTOR', '456 GIDC Industrial Area, Sector 4, Ahmedabad', 'ACTIVE', '2026-08-10', 'Key distributor in Gujarat region.', $1),
      ('Priya Nair', '9765432109', 'priya@priyaretails.com', 'Priya Retail Store', '32CCCCC3333C3Z3', 'RETAIL', '789 Market Road, Ernakulam, Kochi', 'ACTIVE', '2026-08-20', 'Regular retail store buyer.', $2),
      ('Siddharth Sen', '9988776655', 'sid@senenterprises.com', 'Sen Enterprises', '19DDDDD4444D4Z4', 'WHOLESALE', '12 Salt Lake City, Sector 5, Kolkata', 'LEAD', '2026-08-12', 'Follow-up regarding office supply pricing.', $2),
      ('Neha Gupta', '9555666777', 'neha@guptastores.com', 'Gupta General Stores', '27EEEEE5555E5Z5', 'RETAIL', '88 Mall Road, Shimla', 'INACTIVE', NULL, 'On hold due to payment delays.', $1)
      RETURNING id, customer_name;
    `, [adminId]);

    const customers = customerRes.rows;
    const customerRahul = customers.find(c => c.customer_name === 'Rahul Sharma').id;
    const customerAmit = customers.find(c => c.customer_name === 'Amit Patel').id;
    const customerPriya = customers.find(c => c.customer_name === 'Priya Nair').id;
    const customerSid = customers.find(c => c.customer_name === 'Siddharth Sen').id;

    // 3. Seed Follow-ups
    console.log('Inserting follow-ups...');
    await pool.query(`
      INSERT INTO follow_ups (customer_id, note, follow_up_date, created_by) VALUES
      ($1, 'First intro call. Shared corporate catalog.', '2026-08-01', $5),
      ($1, 'Follow-up call. Requested pricing for 50 laptop bags.', '2026-08-08', $5),
      ($2, 'Meeting at office. Confirmed logistics options.', '2026-08-05', $5),
      ($3, 'Sent quotation for office supplies.', '2026-08-07', $5),
      ($4, 'Lead generated from website query.', '2026-08-06', $5)
    `, [customerRahul, customerAmit, customerPriya, customerSid, salesId]);

    // 4. Seed Products
    console.log('Inserting products...');
    const productRes = await pool.query(`
      INSERT INTO products (product_name, sku, category, unit_price, current_stock, min_stock_alert, location, created_by) VALUES
      ('Dell Latitude Laptop', 'ELEC001', 'Electronics', 45000.00, 50, 5, 'Row A - Shelf 2', $6),
      ('ThinkPad X1 Carbon', 'ELEC002', 'Electronics', 85000.00, 10, 3, 'Row A - Shelf 3', $6),
      ('Classic Laptop Bag', 'BAG001', 'Accessories', 1200.00, 100, 15, 'Row B - Shelf 1', $6),
      ('Ergonomic Office Chair', 'FURN001', 'Furniture', 8500.00, 15, 2, 'Row C - Shelf 4', $6),
      ('Gel Pen Blue Box', 'OFF001', 'Office Supplies', 120.00, 200, 20, 'Row D - Shelf 1', $6),
      ('HP Laser Jet Printer', 'ELEC003', 'Electronics', 18500.00, 2, 5, 'Row A - Shelf 4', $6),
      ('Type-C USB Hub 6-in-1', 'ACC001', 'Accessories', 1500.00, 0, 10, 'Row B - Shelf 2', $6),
      ('Standing Computer Desk', 'FURN002', 'Furniture', 14500.00, 25, 5, 'Row C - Shelf 1', $6)
      RETURNING id, sku;
    `, [warehouseId]);

    const products = productRes.rows;
    const pLaptop = products.find(p => p.sku === 'ELEC001').id;
    const pThinkpad = products.find(p => p.sku === 'ELEC002').id;
    const pBag = products.find(p => p.sku === 'BAG001').id;
    const pChair = products.find(p => p.sku === 'FURN001').id;
    const pPen = products.find(p => p.sku === 'OFF001').id;
    const pPrinter = products.find(p => p.sku === 'ELEC003').id;
    const pDesk = products.find(p => p.sku === 'FURN002').id;

    // 5. Seed Stock Movements
    console.log('Inserting stock movements...');
    await pool.query(`
      INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by) VALUES
      ($1, 50, 'IN', 'Initial Purchase', $8),
      ($2, 10, 'IN', 'Initial Purchase', $8),
      ($3, 100, 'IN', 'Initial Purchase', $8),
      ($4, 15, 'IN', 'Initial Purchase', $8),
      ($5, 200, 'IN', 'Initial Purchase', $8),
      ($6, 2, 'IN', 'Initial Purchase', $8),
      ($7, 10, 'IN', 'Initial Purchase', $8),
      ($7, 10, 'OUT', 'Damaged stock dump', $8),
      ($8, 25, 'IN', 'Initial Purchase', $8)
    `, [pLaptop, pThinkpad, pBag, pChair, pPen, pPrinter, pPrinter, warehouseId]); // Note: HP Laser jet / USB hub ids

    // 6. Seed Draft Challans (Avoid confirmed ones to prevent stock state mismatch)
    console.log('Inserting draft challans...');
    // Challan 1
    const ch1Res = await pool.query(`
      INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by) VALUES
      ('CH-2026-0001', $1, 7, 'DRAFT', $2) RETURNING id;
    `, [customerRahul, salesId]);
    const ch1Id = ch1Res.rows[0].id;

    await pool.query(`
      INSERT INTO challan_items (challan_id, product_id, product_name, sku, unit_price, quantity) VALUES
      ($1, $2, 'Dell Latitude Laptop', 'ELEC001', 45000.00, 2),
      ($1, $3, 'Classic Laptop Bag', 'BAG001', 1200.00, 5)
    `, [ch1Id, pLaptop, pBag]);

    // Challan 2
    const ch2Res = await pool.query(`
      INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by) VALUES
      ('CH-2026-0002', $1, 4, 'DRAFT', $2) RETURNING id;
    `, [customerAmit, salesId]);
    const ch2Id = ch2Res.rows[0].id;

    await pool.query(`
      INSERT INTO challan_items (challan_id, product_id, product_name, sku, unit_price, quantity) VALUES
      ($1, $2, 'ThinkPad X1 Carbon', 'ELEC002', 85000.00, 1),
      ($1, $3, 'Ergonomic Office Chair', 'FURN001', 8500.00, 3)
    `, [ch2Id, pThinkpad, pChair]);

    // Challan 3
    const ch3Res = await pool.query(`
      INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by) VALUES
      ('CH-2026-0003', $1, 50, 'DRAFT', $2) RETURNING id;
    `, [customerPriya, salesId]);
    const ch3Id = ch3Res.rows[0].id;

    await pool.query(`
      INSERT INTO challan_items (challan_id, product_id, product_name, sku, unit_price, quantity) VALUES
      ($1, $2, 'Gel Pen Blue Box', 'OFF001', 120.00, 50)
    `, [ch3Id, pPen]);

    console.log('Database seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
