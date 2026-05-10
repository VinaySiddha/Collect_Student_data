import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2';

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Keep connections alive so the MySQL server doesn't close them on idle
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Reject connections that take too long to establish
    connectTimeout: 30000,
  });
}

// Singleton: reuse the pool across Next.js hot-reloads in development
const globalForPool = global as unknown as { _mysqlPool: ReturnType<typeof createPool> };

const pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (globalForPool._mysqlPool ??= createPool());

export default pool;

type QueryResult = RowDataPacket[] | ResultSetHeader;
// mysql2 ExecuteValues is (string | number | boolean | null | Buffer | Date)[]
type SqlValues = (string | number | boolean | null | Buffer | Date)[];

/**
 * Executes a query and retries once on a lost-connection error.
 * MySQL servers close idle connections after wait_timeout; this catches
 * the stale-connection case and lets the pool issue a fresh one.
 */
export async function dbExecute<T extends QueryResult>(
  sql: string,
  values?: SqlValues
): Promise<[T, FieldPacket[]]> {
  try {
    return await pool.execute<T>(sql, values);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException & { code?: string }).code;
    if (
      code === 'PROTOCOL_CONNECTION_LOST' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT'
    ) {
      // Retry once — the pool will allocate a fresh connection
      return await pool.execute<T>(sql, values);
    }
    throw err;
  }
}
