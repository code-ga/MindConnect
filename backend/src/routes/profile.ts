import Elysia from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { schema } from "../database/schema";
import { eq } from "drizzle-orm";
import { db } from "../database";
import { Type } from "@sinclair/typebox";
import { dbSchemaTypes } from "../database/type";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { appStateService } from "../services/AppState";
import type { Static } from "@sinclair/typebox";

export const profileRouter = new Elysia({
	prefix: "/profile",
	detail: { description: "Profile Routes", tags: ["Profile"] },
})
	.use(authenticationMiddleware)
	.use(appStateService)
	.guard(
		{ userAuth: true },
		(app) =>
			app
				.get(
					"/me",
					async (ctx) => {
						const profile = await db
							.select()
							.from(schema.profile)
							.where(eq(schema.profile.userId, ctx.user.id));
						if (!profile || profile.length === 0 || !profile[0]) {
							return ctx.status(404, {
								status: 404,
								message: "Profile not found",
								timestamp: Date.now(),
								success: false,
							});
						}
						return ctx.status(200, {
							status: 200,
							data: profile[0],
							message: "Profile fetched successfully",
							timestamp: Date.now(),
							success: true,
						});
					},
					{
						detail: {
							description: "Get Profile",
						},
						response: {
							200: baseResponseSchema(Type.Object(dbSchemaTypes.profile)),
							404: errorResponseSchema,
						},
					},
				)
				.post(
					"/",
					async (ctx) => {
						const alreadyExists = await db
							.select()
							.from(schema.profile)
							.where(eq(schema.profile.userId, ctx.user.id));
						if (alreadyExists && alreadyExists.length > 0) {
							return ctx.status(400, {
								status: 400,
								message: "Profile already exists",
								timestamp: Date.now(),
								success: false,
							});
						}
						const appState = await ctx.appState.getAppState();
						const permission = ["user"] as Static<
							typeof dbSchemaTypes.profile.permission
						>;
						if (appState.createNewAdmin) {
							permission.push("admin");
						}
						const profile = await db
							.insert(schema.profile)
							.values({
								userId: ctx.user.id,
								username: ctx.body.username,
								permission: permission,
							})
							.returning();
						if (!profile || !profile[0]) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not created",
								timestamp: Date.now(),
								success: false,
							});
						}
						ctx.appState.updateAppState({
							createNewAdmin: false,
						});
						return ctx.status(201, {
							status: 201,
							data: profile[0],
							message: "Profile created successfully",
							timestamp: Date.now(),
							success: true,
						});
					},
					{
						body: Type.Object({
							username: dbSchemaTypes.profile.username,
						}),
						response: {
							201: baseResponseSchema(Type.Object(dbSchemaTypes.profile)),
							400: errorResponseSchema,
						},
					},
				)
				.put(
					"/",
					async (ctx) => {
						const profile = await db
							.update(schema.profile)
							.set({ userId: ctx.user.id, username: ctx.body.username })
							.where(eq(schema.profile.userId, ctx.user.id))
							.returning();
						if (!profile || !profile[0]) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not updated",
								timestamp: Date.now(),
								success: false,
							});
						}
						return ctx.status(200, {
							status: 200,
							data: profile[0],
							message: "Profile updated successfully",
							timestamp: Date.now(),
							success: true,
						});
					},
					{
						body: Type.Object({
							username: dbSchemaTypes.profile.username,
						}),
						response: {
							200: baseResponseSchema(Type.Object(dbSchemaTypes.profile)),
							400: errorResponseSchema,
						},
					},
				)
				.get(
					"/",
					async (ctx) => {
						const query = ctx.query;
						if ("profileId" in query) {
							const profile = await db
								.select()
								.from(schema.profile)
								.where(eq(schema.profile.id, query.profileId));
							if (!profile || !profile[0]) {
								return ctx.status(400, {
									status: 400,
									message: "Profile not found",
									timestamp: Date.now(),
									success: false,
								});
							}
							return ctx.status(200, {
								status: 200,
								data: profile[0],
								message: "Profile fetched successfully",
								timestamp: Date.now(),
								success: true,
							});
						}
						if ("userId" in query) {
							const profile = await db
								.select()
								.from(schema.profile)
								.where(eq(schema.profile.userId, query.userId));
							if (!profile || !profile[0]) {
								return ctx.status(400, {
									status: 400,
									message: "Profile not found",
									timestamp: Date.now(),
									success: false,
								});
							}
							return ctx.status(200, {
								status: 200,
								data: profile[0],
								message: "Profile fetched successfully",
								timestamp: Date.now(),
								success: true,
							});
						}
						return ctx.status(400, {
							status: 400,
							message: "Invalid query parameters",
							timestamp: Date.now(),
							success: false,
						});
					},
					{
						query: Type.Union([
							Type.Object({
								profileId: dbSchemaTypes.profile.id,
							}),
							Type.Object({
								userId: dbSchemaTypes.profile.userId,
							}),
						]),
						response: {
							200: baseResponseSchema(Type.Object(dbSchemaTypes.profile)),
							400: errorResponseSchema,
						},
					},
				)
				.patch(
					"/add_role",
					async (ctx) => {
						const alreadyHasRole = await db
							.select()
							.from(schema.profile)
							.where(eq(schema.profile.userId, ctx.user.id));
						if (!alreadyHasRole || !alreadyHasRole[0]) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not found",
								timestamp: Date.now(),
								success: false,
							});
						}
						const permissionSet = new Set([
							...alreadyHasRole[0].permission,
							...ctx.body.permission,
						]);
						if (
							ctx.body.permission.includes("admin") &&
							!alreadyHasRole[0].permission.includes("admin")
						) {
							return ctx.status(400, {
								status: 400,
								message: "Profile already has admin role",
								timestamp: Date.now(),
								success: false,
							});
						}
						if (permissionSet.size === alreadyHasRole[0].permission.length) {
							return ctx.status(400, {
								status: 400,
								message: "Profile already has all the roles",
								timestamp: Date.now(),
								success: false,
							});
						}
						const profile = await db
							.update(schema.profile)
							.set({
								userId: ctx.user.id,
								permission: [...permissionSet],
							})
							.where(eq(schema.profile.userId, ctx.user.id))
							.returning();
						if (!profile || !profile[0]) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not updated",
								timestamp: Date.now(),
								success: false,
							});
						}
						return ctx.status(200, {
							status: 200,
							data: profile[0],
							message: "Profile updated successfully",
							timestamp: Date.now(),
							success: true,
						});
					},
					{
						body: Type.Object({
							permission: dbSchemaTypes.profile.permission,
						}),
						response: {
							200: baseResponseSchema(Type.Object(dbSchemaTypes.profile)),
							400: errorResponseSchema,
						},
						roleAuth: ["manager"],
					},
				),
		// .delete("/", async ({ user }) => {
		// 	const profile = await db
		// 		.delete(schema.profile)
		// 		.where(eq(schema.profile.userId, user.id))
		// 		.returning();
		// 	return profile;
		// }),
	);
