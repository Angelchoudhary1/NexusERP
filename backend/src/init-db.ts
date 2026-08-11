import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
};

const initDb = async () => {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    console.log('Connecting to database...');

    await client.connect();

    console.log('Database connection successful.');

    // Check whether users table already exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) AS exists;
    `);

    const usersExists = result.rows[0].exists;

    // If database is already initialized, don't modify anything
    if (usersExists) {
      console.log('Database already initialized.');
      return;
    }

    console.log('Database is empty. Initializing...');

    // Get schema.sql
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const schemaPath = path.join(
      process.cwd(),
      'scripts',
      'schema.sql'
    );

    console.log(`Reading schema from: ${schemaPath}`);

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at: ${schemaPath}`);
    }

    let sql = fs.readFileSync(schemaPath, 'utf8');

    /*
      IMPORTANT:
      schema.sql contains DROP TABLE commands.
      We remove them because we NEVER want the Render
      database to be deleted during server restart/redeploy.
    */
    sql = sql.replace(
      /DROP TABLE IF EXISTS [^;]+;\s*/gi,
      ''
    );

    console.log('Creating database tables...');

    await client.query(sql);

    console.log('Tables, indexes and triggers created successfully.');

    // Create default users
    console.log('Creating default users...');

    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const salesPassword = await bcrypt.hash('Sales@123', 10);
    const warehousePassword = await bcrypt.hash('Warehouse@123', 10);
    const accountsPassword = await bcrypt.hash('Accounts@123', 10);

    await client.query(
      `
      INSERT INTO users
        (name, email, password, role)
      VALUES
        ('ERP Admin', 'admin@example.com', $1, 'ADMIN'),
        ('Sales Exec', 'sales@example.com', $2, 'SALES'),
        ('Warehouse Keeper', 'warehouse@example.com', $3, 'WAREHOUSE'),
        ('Accounts Clerk', 'accounts@example.com', $4, 'ACCOUNTS')
      ON CONFLICT (email) DO NOTHING;
      `,
      [
        adminPassword,
        salesPassword,
        warehousePassword,
        accountsPassword,
      ]
    );

    console.log('Default users created successfully.');

    console.log('========================================');
    console.log('DATABASE INITIALIZATION COMPLETED');
    console.log('========================================');
    console.log('Admin login:');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    console.log('========================================');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};

initDb().catch(() => {
  process.exit(1);
});