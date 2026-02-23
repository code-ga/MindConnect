import Elysia, { t } from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { db } from "../database";
import { schema } from "../database/schema";
import { eq, desc, and } from "drizzle-orm";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { dbSchemaTypes } from "../database/type";

export const notificationRouter = new Elysia({
	prefix: "/notification",
	detail: { description: "Notification Routes", tags: ["Notification"] },
})
	.use(authenticationMiddleware)
	.guard({ userAuth: true }, (app) =>
		app
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

					const notifications = await db
						.select()
						.from(schema.notification)
						.where(eq(schema.notification.profileId, ctx.profile.id))
						.orderBy(desc(schema.notification.createdAt));

					return ctx.status(200, {
						status: 200,
						data: notifications,
						message: "Notifications fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(
							t.Array(t.Object(dbSchemaTypes.notification)),
						),
						400: errorResponseSchema,
					},
				},
			)
			.patch(
				"/:id/read",
				async (ctx) => {
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					await db
						.update(schema.notification)
						.set({ readStatus: true })
						.where(
							and(
								eq(schema.notification.id, ctx.params.id),
								eq(schema.notification.profileId, ctx.profile.id),
							),
						);

					return ctx.status(200, {
						status: 200,
						data: null,
						message: "Notification marked as read",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(t.Null()),
						400: errorResponseSchema,
					},
				},
			),
	);
