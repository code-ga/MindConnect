import Elysia from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { db } from "../database";
import { schema } from "../database/schema";
import { eq } from "drizzle-orm";
import { Type } from "@sinclair/typebox";
import { dbSchemaTypes } from "../database/type";
import { baseResponseSchema, errorResponseSchema } from "../types";

export const userRequestRouter = new Elysia({
	prefix: "/user-request",
	detail: { description: "User Request Routes", tags: ["User Request"] },
})
	.use(authenticationMiddleware)
	.guard({ userAuth: true }, (app) =>
		app
			.post(
				"/",
				async (ctx) => {
					const request = await db
						.insert(schema.userRequest)
						.values({
							userId: ctx.user.id,
							content: ctx.body.content,
							type: ctx.body.type,
							status: "pending",
						})
						.returning();
					if (!request || !request[0]) {
						return ctx.status(400, {
							status: 400,
							message: "User request not created",
							timestamp: Date.now(),
							success: false,
						});
					}
					return ctx.status(201, {
						status: 201,
						data: request[0],
						message: "User request created successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					body: Type.Object({
						content: dbSchemaTypes.userRequest.content,
						type: dbSchemaTypes.userRequest.type,
					}),
					response: {
						201: baseResponseSchema(Type.Object(dbSchemaTypes.userRequest)),
						400: errorResponseSchema,
					},
				},
			)
			.get(
				"/",
				async (ctx) => {
					const requests = await db
						.select()
						.from(schema.userRequest)
						.where(eq(schema.userRequest.userId, ctx.user.id));
					return ctx.status(200, {
						status: 200,
						data: requests,
						message: "User requests fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object(dbSchemaTypes.userRequest)),
						),
						400: errorResponseSchema,
					},
				},
			),
	)
	.guard({ roleAuth: ["manager"] }, (app) =>
		app.get(
			"/",
			async (ctx) => {
				const requests = await db.select().from(schema.userRequest);
				return ctx.status(200, {
					status: 200,
					data: requests,
					message: "User requests fetched successfully",
					timestamp: Date.now(),
					success: true,
				});
			},
			{
				response: {
					200: baseResponseSchema(
						Type.Array(Type.Object(dbSchemaTypes.userRequest)),
					),
					400: errorResponseSchema,
				},
			},
		),
	);
