import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runSchema = async () => {
  try {
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running SQL Schema...');
    await pool.query(sql);
    console.log('Database tables, constraints, and indexes created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error running schema script:', error);
    process.exit(1);
  }
};

runSchema();
