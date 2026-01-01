import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { schema } from "./schema";

export const dbSchemaTypes = Object.fromEntries(
	Object.entries(schema).map(([tableName, table]) => [
		tableName,
		{
			insert: createInsertSchema(table),
			select: createSelectSchema(table),
		},
	]),
) as unknown as {
	[K in keyof typeof schema]: {
		insert: ReturnType<typeof createInsertSchema<(typeof schema)[K]>>;
		/// @ts-expect-error
		select: ReturnType<typeof createSelectSchema<(typeof schema)[K]>>;
	};
};
export type DBSchemaTypes = typeof dbSchemaTypes;

export type DBSchema = typeof schema;
export type DBTableName = keyof DBSchema;
export type DBInsertType<TTableName extends DBTableName> =
	(typeof dbSchemaTypes)[TTableName]["insert"];
export type DBSelectType<TTableName extends DBTableName> =
	(typeof dbSchemaTypes)[TTableName]["select"];
