import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function init() {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  const ssl =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false };
  _pool = new Pool({ connectionString, ssl });
  _db = drizzle(_pool, { schema });
  return _db;
}

/**
 * Lazily-created Drizzle instance. Accessing it without DATABASE_URL set throws,
 * but that path is only ever reached when a real database is expected (i.e. when
 * NOT in fallback mode). This lets the app boot and serve entirely from the
 * in-memory fallback store with zero external dependencies.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop: string) {
    const instance = init();
    if (!instance) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    return (instance as any)[prop];
  },
}) as unknown as ReturnType<typeof drizzle<typeof schema>>;

export const getPool = () => {
  const instance = init();
  if (!instance) throw new Error("DATABASE_URL must be set");
  return _pool!;
};

export * from "./schema";
