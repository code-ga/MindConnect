import { Static, t, TSchema } from "elysia"

export const baseResponseSchema = <T extends TSchema>(dataSchema: T) => {
  return t.Object({
    success: t.Boolean(),
    message: t.String().optional(),
    data: dataSchema,
    timestamp: t.Number().optional().default(() => Date.now()),
    status: t.Number().optional().default(() => 200),
  });
};

export type BaseResponse<T extends TSchema> = Static<ReturnType<typeof baseResponseSchema<T>>>;

export const paginatedResponseSchema = <T extends TSchema>(dataSchema: T) => {
  return baseResponseSchema(
    t.Object({
      items: t.Array(dataSchema),
      total: t.Number(),
      page: t.Number(),
      pageSize: t.Number(),
      totalPages: t.Number(),
    })
  );
};

export type PaginatedResponse<T extends TSchema> = Static<ReturnType<typeof paginatedResponseSchema<T>>>;


export const errorResponseSchema = z.object({
  success: t.Boolean().default(false),
  message: t.String(),
  timestamp: t.Number().optional().default(() => Date.now()),
  status: t.Number().optional().default(() => 500),
});
export type ErrorResponse = Static<typeof errorResponseSchema>;