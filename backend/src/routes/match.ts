import Elysia, { t } from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { matchingService } from "../services/matching";
import { baseResponseSchema, errorResponseSchema } from "../types";

export const matchRouter = new Elysia({
	prefix: "/match",
	detail: { description: "Matching Routes", tags: ["Matching"] },
})
	.use(authenticationMiddleware)
	.guard({ userAuth: true }, (app) =>
		app
			.post(
				"/start",
				async (ctx) => {
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					const roles = ctx.body.roles as (
						| "listener"
						| "psychologist"
						| "therapist"
					)[];

					const result = await matchingService.startMatching(
						ctx.profile.id,
						roles,
					);

					if (!result.success) {
						return ctx.status(400, {
							status: 400,
							message: result.message,
							timestamp: Date.now(),
							success: false,
						});
					}

					return ctx.status(200, {
						status: 200,
						data: null,
						message: result.message,
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					body: t.Object({
						roles: t.Array(t.String()),
					}),
					response: {
						200: baseResponseSchema(t.Null()),
						400: errorResponseSchema,
					},
				},
			)
			.post(
				"/stop",
				async (ctx) => {
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					const result = matchingService.stopMatching(ctx.profile.id);

					return ctx.status(200, {
						status: 200,
						data: null,
						message: result.message,
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
