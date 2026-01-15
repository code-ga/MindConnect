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
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					const request = await db
						.insert(schema.userRequest)
						.values({
							profileId: ctx.profile.id,
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
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					const requests = await db
						.select()
						.from(schema.userRequest)
						.where(eq(schema.userRequest.profileId, ctx.profile.id));
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
		app
			.get(
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
			)
			// accept or reject request
			.put(
				"/process/:id",
				async (ctx) => {
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					const request = await db
						.select()
						.from(schema.userRequest)
						.where(eq(schema.userRequest.id, ctx.params.id));
					if (!request || !request[0]) {
						return ctx.status(404, {
							status: 404,
							message: "User request not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					if (ctx.body.status === "processing") {
						await db
							.update(schema.userRequest)
							.set({
								status: "processing",
							})
							.where(eq(schema.userRequest.id, ctx.params.id));
					} else if (ctx.body.status === "rejected") {
						if (!ctx.body.reason) {
							return ctx.status(400, {
								status: 400,
								message: "Reason is required",
								timestamp: Date.now(),
								success: false,
							});
						}
						await db
							.update(schema.userRequest)
							.set({
								status: "rejected",
								processedReason: ctx.body.reason,
								processedAt: new Date(),
								processedBy: ctx.profile.id,
								processedNote: ctx.body.note,
							})
							.where(eq(schema.userRequest.id, ctx.params.id));
					} else if (ctx.body.status === "accepted") {
						await db
							.update(schema.userRequest)
							.set({
								status: "accepted",
								processedAt: new Date(),
								processedBy: ctx.profile.id,
								processedNote: ctx.body.note,
							})
							.where(eq(schema.userRequest.id, ctx.params.id));
					}
					return ctx.status(200, {
						status: 200,
						data: request[0],
						message: "User request processed successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					body: Type.Object({
						status: dbSchemaTypes.userRequest.status,
						reason: Type.Optional(Type.String()),
						note: Type.Optional(Type.String()),
					}),
					response: {
						200: baseResponseSchema(Type.Object(dbSchemaTypes.userRequest)),
						400: errorResponseSchema,
						404: errorResponseSchema,
					},
				},
			)
			.get(
				"/:id",
				async (ctx) => {
					const request = await db
						.select()
						.from(schema.userRequest)
						.where(eq(schema.userRequest.id, ctx.params.id));
					if (!request || !request[0]) {
						return ctx.status(404, {
							status: 404,
							message: "User request not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					return ctx.status(200, {
						status: 200,
						data: request[0],
						message: "User request fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(Type.Object(dbSchemaTypes.userRequest)),
						404: errorResponseSchema,
					},
				},
			)
			.put(
				"/edit-note/:id",
				async (ctx) => {
					const alreadyRequest = await db
						.select()
						.from(schema.userRequest)
						.where(eq(schema.userRequest.id, ctx.params.id));
					if (!alreadyRequest || !alreadyRequest[0]) {
						return ctx.status(404, {
							status: 404,
							message: "User request not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					if (alreadyRequest[0].processedBy === ctx.profile.id) {
						return ctx.status(400, {
							status: 400,
							message: "Note is already updated",
							timestamp: Date.now(),
							success: false,
						});
					}
					const request = await db
						.select()
						.from(schema.userRequest)
						.where(eq(schema.userRequest.id, ctx.params.id));
					if (!request || !request[0]) {
						return ctx.status(404, {
							status: 404,
							message: "User request not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					await db
						.update(schema.userRequest)
						.set({
							processedNote: ctx.body.note,
						})
						.where(eq(schema.userRequest.id, ctx.params.id));
					return ctx.status(200, {
						status: 200,
						data: request[0],
						message: "User request note edited successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					body: Type.Object({
						note: Type.String(),
					}),
					response: {
						200: baseResponseSchema(Type.Object(dbSchemaTypes.userRequest)),
						404: errorResponseSchema,
						400: errorResponseSchema,
					},
				},
			),
	);
