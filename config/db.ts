import { Pool, QueryResult, QueryResultRow } from 'pg';

/**
 * PostgreSQL is OFF unless USE_DATABASE=true is set in .env.local.
 * By default MediChain keeps its data in the local `data/` folder, so the project
 * behaves the same on every laptop, whether or not PostgreSQL happens to be installed.
 */
export const DB_ENABLED = process.env.USE_DATABASE === 'true';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'medichain',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err: Error) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Execute a parameterized query against the database.
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    // Every caller treats an error as "no database" and uses the local data/ folder instead
    if (!DB_ENABLED) throw new Error('Database disabled (set USE_DATABASE=true to use PostgreSQL)');
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
        console.log('[DB]', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
}

/**
 * Get a client from the pool for transactions.
 */
export async function getClient() {
    if (!DB_ENABLED) throw new Error('Database disabled (set USE_DATABASE=true to use PostgreSQL)');
    const client = await pool.connect();
    return client;
}

export { pool };
export default { query, getClient, pool };
