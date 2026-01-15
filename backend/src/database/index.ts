// import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePGlite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import path from "path";
import { schema } from "./schema";
import { migrate } from "drizzle-orm/pglite/migrator";
import { relations } from "./schema";

const isProduction = process.env.NODE_ENV === "production";

const dbUrl = process.env.DATABASE_URL?.replace(/^"|"$/g, "") || "memory://";
export const db = isProduction
	? drizzlePostgres(dbUrl, {
			schema,
			relations,
		})
	: drizzlePGlite(dbUrl, {
			schema,
			relations,
		});
export type Database = typeof db;
if (!isProduction) {
	// For Electric, we need to initialize the database
	// This is not needed for production with a real Postgres database
	try {
		console.log("Running migrations...");
		await migrate(db, {
			migrationsFolder: path.join(__dirname, "../../drizzle"),
		});
		console.log("Migrations complete.");
	} catch (error) {
		console.error("Error running migrations:", error);
	}
}
