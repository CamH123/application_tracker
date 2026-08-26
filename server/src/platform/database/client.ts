import pg from "pg";

pg.types.setTypeParser(1114, (value) => value);
pg.types.setTypeParser(1184, (value) => value);
pg.types.setTypeParser(1082, (value) => value);

export const LOCAL_OWNER_ID = "00000000-0000-4000-8000-000000000001";

export interface Database {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<pg.QueryResult<T>>;
}

export const createPool = (
  connectionString = process.env.DATABASE_URL,
): pg.Pool => {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  return new pg.Pool({ connectionString });
};

export const inTransaction = async <T>(
  pool: pg.Pool,
  operation: (database: Database) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
