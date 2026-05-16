import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2';

function getSslConfig() {
  const sslEnv = (process.env.DB_SSL ?? '').trim().toLowerCase();

  // Keep SSL opt-in because some shared-hosting MySQL endpoints do not support TLS.
  if (sslEnv === '1' || sslEnv === 'true' || sslEnv === 'required') {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

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
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 30000,
    ssl: getSslConfig(),
    dateStrings: true,
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
type SqlValues = (string | number | boolean | null | Buffer | Date)[];

export async function dbExecute<T extends QueryResult>(
  sql: string,
  values?: SqlValues
): Promise<[T, FieldPacket[]]> {
  const maxRetries = 3;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await pool.execute<T>(sql, values);
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException & { code?: string }).code;
      const isRetryableError =
        code === 'PROTOCOL_CONNECTION_LOST' ||
        code === 'ECONNRESET' ||
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT' ||
        code === 'HANDSHAKE_NO_SSL_SUPPORT' ||
        code === 'HANDSHAKE_TIMEOUT';

      if (isRetryableError && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export type DbConnection = mysql.PoolConnection;

/** Execute a query on a specific connection (used inside transactions). */
export async function connExecute<T extends QueryResult>(
  conn: DbConnection,
  sql: string,
  values?: SqlValues
): Promise<[T, FieldPacket[]]> {
  return conn.execute<T>(sql, values);
}

/**
 * Run `fn` inside a MySQL transaction.
 * Commits on success; rolls back and re-throws on any error.
 */
export async function withTransaction<T>(fn: (conn: DbConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
