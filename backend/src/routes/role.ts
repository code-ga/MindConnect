import Elysia from "elysia";
import { authenticationMiddleware, c } from "../middleware/auth";
import { db } from "../database";
import { schema } from "../database/schema";
import { eq } from "drizzle-orm";
import { Type } from "@sinclair/typebox";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { matchingService } from "../services/matching";

const roleShape = Type.Object({
	id: Type.String(),
	name: Type.String(),
	description: Type.Union([Type.String(), Type.Null()]),
	scope: Type.String(),
	isMatchable: Type.Boolean(),
	isDefault: Type.Boolean(),
	createdAt: Type.String(),
	updatedAt: Type.String(),
});

const roleWithPermissionsShape = Type.Object({
	id: Type.String(),
	name: Type.String(),
	description: Type.Union([Type.String(), Type.Null()]),
	scope: Type.String(),
	isMatchable: Type.Boolean(),
	isDefault: Type.Boolean(),
	createdAt: Type.String(),
	updatedAt: Type.String(),
	permissions: Type.Array(
		Type.Object({
			id: Type.String(),
			resource: Type.String(),
			action: Type.String(),
		}),
	),
});

const rolePermissionShape = Type.Object({
	id: Type.String(),
	roleId: Type.String(),
	resource: Type.String(),
	action: Type.String(),
	createdAt: Type.String(),
});

export const roleRouter = new Elysia({
	prefix: "/role",
	detail: { description: "Role Management Routes", tags: ["Role"] },
})
	.use(authenticationMiddleware)
	// GET / — list all roles with their permissions (authenticated)
	.guard({ userAuth: true }, (app) =>
		app.get(
			"/",
			async (ctx) => {
				const roles = await db.select().from(schema.role);
				const permissions = await db.select().from(schema.rolePermission);

				const result = roles.map((r) => ({
					...r,
					createdAt: r.createdAt.toISOString(),
					updatedAt: r.updatedAt.toISOString(),
					permissions: permissions
						.filter((p) => p.roleId === r.id)
						.map((p) => ({
							id: p.id,
							resource: p.resource,
							action: p.action,
						})),
				}));

				const query = ctx.query as Record<string, string | undefined>;
				const filtered = result.filter((r) => {
					if (query.scope && r.scope !== query.scope) return false;
					if (query.isMatchable !== undefined) {
						const want = query.isMatchable === "true";
						if (r.isMatchable !== want) return false;
					}
					return true;
				});

				return ctx.status(200, {
					status: 200,
					data: filtered,
					message: "Roles fetched successfully",
					timestamp: Date.now(),
					success: true,
				});
			},
			{
				query: Type.Optional(
					Type.Object({
						scope: Type.Optional(Type.String()),
						isMatchable: Type.Optional(Type.String()),
					}),
				),
				response: {
					200: baseResponseSchema(Type.Array(roleWithPermissionsShape)),
				},
			},
		),
	)
	// Admin-only: create, update, delete roles and permissions
	.guard({ roleAuth: c.any("admin") }, (app) =>
		app
			.post(
				"/",
				async (ctx) => {
					const existing = await db
						.select()
						.from(schema.role)
						.where(eq(schema.role.name, ctx.body.name));
					if (existing.length > 0) {
						return ctx.status(400, {
							status: 400,
							message: "Role with this name already exists",
							timestamp: Date.now(),
							success: false,
						});
					}

					const [created] = await db
						.insert(schema.role)
						.values({
							name: ctx.body.name,
							description: ctx.body.description ?? null,
							scope: ctx.body.scope ?? "system",
							isMatchable: ctx.body.isMatchable ?? false,
							isDefault: ctx.body.isDefault ?? false,
						})
						.returning();

					if (!created) {
						return ctx.status(400, {
							status: 400,
							message: "Failed to create role",
							timestamp: Date.now(),
							success: false,
						});
					}

					if (created.isMatchable) {
						await matchingService.refreshMatchableRoles();
					}

					return ctx.status(201, {
						status: 201,
						data: {
							...created,
							createdAt: created.createdAt.toISOString(),
							updatedAt: created.updatedAt.toISOString(),
						},
						message: "Role created successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					body: Type.Object({
						name: Type.String(),
						description: Type.Optional(Type.String()),
						scope: Type.Optional(Type.String()),
						isMatchable: Type.Optional(Type.Boolean()),
						isDefault: Type.Optional(Type.Boolean()),
					}),
					response: {
						201: baseResponseSchema(roleShape),
						400: errorResponseSchema,
					},
				},
			)
			.put(
				"/:id",
				async (ctx) => {
					const [updated] = await db
						.update(schema.role)
						.set({
							name: ctx.body.name,
							description: ctx.body.description,
							scope: ctx.body.scope,
							isMatchable: ctx.body.isMatchable,
							isDefault: ctx.body.isDefault,
						})
						.where(eq(schema.role.id, ctx.params.id))
						.returning();

					if (!updated) {
						return ctx.status(404, {
							status: 404,
							message: "Role not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					await matchingService.refreshMatchableRoles();

					return ctx.status(200, {
						status: 200,
						data: {
							...updated,
							createdAt: updated.createdAt.toISOString(),
							updatedAt: updated.updatedAt.toISOString(),
						},
						message: "Role updated successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					params: Type.Object({ id: Type.String() }),
					body: Type.Object({
						name: Type.Optional(Type.String()),
						description: Type.Optional(Type.String()),
						scope: Type.Optional(Type.String()),
						isMatchable: Type.Optional(Type.Boolean()),
						isDefault: Type.Optional(Type.Boolean()),
					}),
					response: {
						200: baseResponseSchema(roleShape),
						404: errorResponseSchema,
					},
				},
			)
			.delete(
				"/:id",
				async (ctx) => {
					const [deleted] = await db
						.delete(schema.role)
						.where(eq(schema.role.id, ctx.params.id))
						.returning();

					if (!deleted) {
						return ctx.status(404, {
							status: 404,
							message: "Role not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					await matchingService.refreshMatchableRoles();

					return ctx.status(200, {
						status: 200,
						data: {
							...deleted,
							createdAt: deleted.createdAt.toISOString(),
							updatedAt: deleted.updatedAt.toISOString(),
						},
						message: "Role deleted successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					params: Type.Object({ id: Type.String() }),
					response: {
						200: baseResponseSchema(roleShape),
						404: errorResponseSchema,
					},
				},
			)
			// Role permissions
			.get(
				"/:id/permissions",
				async (ctx) => {
					const permissions = await db
						.select()
						.from(schema.rolePermission)
						.where(eq(schema.rolePermission.roleId, ctx.params.id));

					return ctx.status(200, {
						status: 200,
						data: permissions.map((p) => ({
							...p,
							createdAt: p.createdAt.toISOString(),
						})),
						message: "Permissions fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					params: Type.Object({ id: Type.String() }),
					response: {
						200: baseResponseSchema(Type.Array(rolePermissionShape)),
					},
				},
			)
			.post(
				"/:id/permissions",
				async (ctx) => {
					const roleExists = await db
						.select()
						.from(schema.role)
						.where(eq(schema.role.id, ctx.params.id));
					if (roleExists.length === 0) {
						return ctx.status(404, {
							status: 404,
							message: "Role not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					const [created] = await db
						.insert(schema.rolePermission)
						.values({
							roleId: ctx.params.id,
							resource: ctx.body.resource,
							action: ctx.body.action,
						})
						.returning();

					if (!created) {
						return ctx.status(400, {
							status: 400,
							message: "Failed to add permission",
							timestamp: Date.now(),
							success: false,
						});
					}

					return ctx.status(201, {
						status: 201,
						data: {
							...created,
							createdAt: created.createdAt.toISOString(),
						},
						message: "Permission added successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					params: Type.Object({ id: Type.String() }),
					body: Type.Object({
						resource: Type.String(),
						action: Type.String(),
					}),
					response: {
						201: baseResponseSchema(rolePermissionShape),
						400: errorResponseSchema,
						404: errorResponseSchema,
					},
				},
			)
			.delete(
				"/:id/permissions/:permId",
				async (ctx) => {
					const [deleted] = await db
						.delete(schema.rolePermission)
						.where(eq(schema.rolePermission.id, ctx.params.permId))
						.returning();

					if (!deleted) {
						return ctx.status(404, {
							status: 404,
							message: "Permission not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					return ctx.status(200, {
						status: 200,
						data: {
							...deleted,
							createdAt: deleted.createdAt.toISOString(),
						},
						message: "Permission removed successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					params: Type.Object({
						id: Type.String(),
						permId: Type.String(),
					}),
					response: {
						200: baseResponseSchema(rolePermissionShape),
						404: errorResponseSchema,
					},
				},
			),
	);
