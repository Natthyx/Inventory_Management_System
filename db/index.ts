import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type StockFlowDatabaseClient = NeonHttpDatabase<typeof schema>;

let pooledClient: StockFlowDatabaseClient | null = null;

function hydrateDatabaseClient(): StockFlowDatabaseClient {
  const connectionString = process.env.DATABASE_URL;

  if (typeof connectionString !== "string" || !/^postgres(ql):\/\//i.test(connectionString.trim())) {
    throw new Error("DATABASE_URL must be a Postgres connection URI (postgresql://user:...@host/database).");
  }

  pooledClient ??= drizzle(neon(connectionString), { schema });

  return pooledClient;
}

/** Lazily instantiates Drizzle · Neon bindings so CI builds can omit real credentials. */
export const db = new Proxy({} as StockFlowDatabaseClient, {
  get(_, property, receiver) {
    const hydrated = hydrateDatabaseClient();
    const value = Reflect.get(hydrated as object, property, receiver);

    return typeof value === "function" ? value.bind(hydrated) : value;
  },
});
