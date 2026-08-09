import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('neon.tech') || process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log(`Executed query: ${text.slice(0, 100)}... in ${duration}ms`);
  }
  return res;
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};
