import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Singleton pattern for Next.js hot-reloading
const globalForPool = global as unknown as { pool: typeof pool };

if (process.env.NODE_ENV !== 'production') {
  if (!globalForPool.pool) {
    globalForPool.pool = pool;
  }
}

export default process.env.NODE_ENV === 'production' ? pool : globalForPool.pool || pool;
