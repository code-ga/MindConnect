import { Elysia } from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { db } from "../database";
import { schema } from "../database/schema";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { Type } from "@sinclair/typebox";
import { dbSchemaTypes } from "../database/type";
import { eq } from "drizzle-orm";

export const clusterRoute = new Elysia({ prefix: "/cluster" })
	.use(authenticationMiddleware)
	.post(
		"/",
		async (ctx) => {
			const { name, description, tags } = ctx.body;
			const cluster = await db
				.insert(schema.k8sCluster)
				.values({
					name,
					description,
					tags,
				})
				.returning();
			if (cluster.length === 0 || !cluster[0]) {
				return ctx.status(500, {
					success: false,
					message: "Failed to create cluster",
				});
			}
			return ctx.status(201, {
				success: true,
				message: "Cluster created successfully",
				data: cluster[0],
				timestamp: Date.now(),
			});
		},
		{
			detail: {
				tags: ["Cluster"],
			},
			response: {
				201: baseResponseSchema(Type.Object(dbSchemaTypes.k8sCluster)),
				500: errorResponseSchema,
			},
			body: Type.Object({
				name: dbSchemaTypes.k8sCluster.name,
				description: dbSchemaTypes.k8sCluster.description,
				tags: dbSchemaTypes.k8sCluster.tags,
				// kubeconfig: Type.String(),
			}),
		},
	)
	.get(
		"/",
		async (ctx) => {
			const clusters = await db.select().from(schema.k8sCluster);
			return ctx.status(200, {
				success: true,
				message: "Cluster fetched successfully",
				data: clusters,
				timestamp: Date.now(),
			});
		},
		{
			detail: {
				tags: ["Cluster"],
			},
			response: {
				200: baseResponseSchema(
					Type.Array(Type.Object(dbSchemaTypes.k8sCluster)),
				),
			},
		},
	)
	.patch(
		"/:id",
		async (ctx) => {
			const { name, description, tags } = ctx.body;
			const cluster = await db
				.update(schema.k8sCluster)
				.set({
					name,
					description,
					tags,
				})
				.where(eq(schema.k8sCluster.id, Number(ctx.params.id)))
				.returning();
			if (cluster.length === 0 || !cluster[0]) {
				return ctx.status(404, {
					success: false,
					message: "Cluster not found",
				});
			}
			return ctx.status(200, {
				success: true,
				message: "Cluster updated successfully",
				data: cluster[0],
				timestamp: Date.now(),
			});
		},
		{
			detail: {
				tags: ["Cluster"],
			},
			response: {
				200: baseResponseSchema(Type.Object(dbSchemaTypes.k8sCluster)),
				404: errorResponseSchema,
			},
			body: Type.Partial(
				Type.Object({
					name: dbSchemaTypes.k8sCluster.name,
					description: dbSchemaTypes.k8sCluster.description,
					tags: dbSchemaTypes.k8sCluster.tags,
				}),
			),
		},
	)
	.delete(
		"/:id",
		async (ctx) => {
			const cluster = await db
				.delete(schema.k8sCluster)
				.where(eq(schema.k8sCluster.id, Number(ctx.params.id)))
				.returning();
			if (cluster.length === 0 || !cluster[0]) {
				return ctx.status(404, {
					success: false,
					message: "Cluster not found",
				});
			}
			return ctx.status(200, {
				success: true,
				message: "Cluster deleted successfully",
				data: cluster[0],
				timestamp: Date.now(),
			});
		},
		{
			detail: {
				tags: ["Cluster"],
			},
			response: {
				200: baseResponseSchema(Type.Object(dbSchemaTypes.k8sCluster)),
				404: errorResponseSchema,
			},
		},
	)
	.get(
		"/:id",
		async (ctx) => {
			const cluster = await db
				.select()
				.from(schema.k8sCluster)
				.where(eq(schema.k8sCluster.id, Number(ctx.params.id)));
			if (cluster.length === 0 || !cluster[0]) {
				return ctx.status(404, {
					success: false,
					message: "Cluster not found",
				});
			}
			return ctx.status(200, {
				success: true,
				message: "Cluster fetched successfully",
				data: cluster[0],
				timestamp: Date.now(),
			});
		},
		{
			detail: {
				tags: ["Cluster"],
			},
			response: {
				200: baseResponseSchema(Type.Object(dbSchemaTypes.k8sCluster)),
				404: errorResponseSchema,
			},
		},
	)
	.get(
		"/:id/agent-config",
		async (ctx) => {
			const cluster = await db
				.select()
				.from(schema.k8sCluster)
				.where(eq(schema.k8sCluster.id, Number(ctx.params.id)));
			if (cluster.length === 0 || !cluster[0]) {
				return ctx.status(404, {
					success: false,
					message: "Cluster not found",
				});
			}
			return ctx.status(200, {
				success: true,
				message: "Cluster agent config fetched successfully",
				data: {
					clusterId: cluster[0].id,
					clusterName: cluster[0].name,
					clusterToken: cluster[0].agentToken,
				},
				timestamp: Date.now(),
			});
		},
		{
			detail: {
				tags: ["Cluster"],
			},
			response: {
				200: baseResponseSchema(
					Type.Object({
						clusterId: Type.Number(),
						clusterName: Type.String(),
						clusterToken: Type.String(),
					}),
				),
				404: errorResponseSchema,
			},
		},
	);

export type ClusterRoute = typeof clusterRoute;
