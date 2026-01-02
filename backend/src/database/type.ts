import { schema } from "./schema";
import { spreads } from "./speard";

export const dbSchemaTypes = spreads(schema, "select");

export type DBSchemaTypes = typeof dbSchemaTypes;

export type DBSchema = typeof schema;
export type DBTableName = keyof DBSchema;
