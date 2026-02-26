import Elysia, { t, type Static } from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { matchingService } from "../services/matching";
import { baseResponseSchema, errorResponseSchema } from "../types";
import type { dbSchemaTypes } from "../database/type";

const waiterRoles = ["listener", "psychologist", "therapist"] as Static<typeof dbSchemaTypes.profile.permission>;

export const matchRouter = new Elysia({
	prefix: "/match",
	detail: { description: "Matching Routes", tags: ["Matching"] },
})
	.use(authenticationMiddleware)
	.guard({ userAuth: true }, (app) =>
		app
			// ============ User Routes ============
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

					const role = ctx.body.role as string;

					const result = await matchingService.enqueueUser(
						ctx.profile.id,
						role as "listener" | "psychologist" | "therapist",
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
							role: t.String(),
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

						const result = matchingService.stopMatching(
							ctx.profile.id,
						);

						return ctx.status(200, {
							status: 200,
							data: null,
							message: result.message,
							timestamp: Date.now(),
							success: result.success,
						});
					},
					{
						response: {
							200: baseResponseSchema(t.Null()),
							400: errorResponseSchema,
						},
					},
				)
				.get(
					"/status",
					async (ctx) => {
						if (!ctx.profile) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not found",
								timestamp: Date.now(),
								success: false,
							});
						}

						const status =
							matchingService.getUserQueueStatus(ctx.profile.id);

						return ctx.status(200, {
							status: 200,
							data: status,
							message: "Queue status retrieved",
							timestamp: Date.now(),
							success: true,
						});
					},
					{
						response: {
							200: baseResponseSchema(
								t.Object({
									inQueue: t.Boolean(),
									requestedRole: t.Union([
										t.Literal("listener"),
										t.Literal("psychologist"),
										t.Literal("therapist"),
										t.Null(),
									]),
								}),
							),
							400: errorResponseSchema,
						},
					},
				)
				// ============ Waiter Routes ============
				.post(
					"/waiter/working",
					async (ctx) => {
						if (!ctx.profile) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not found",
								timestamp: Date.now(),
								success: false,
							});
						}

						const roles = ctx.body.roles as string[];

						const result = await matchingService.setWaiterWorking(
							ctx.profile.id,
							roles as ("listener" | "psychologist" | "therapist")[],
							ctx.profile.permission,
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
						roleAuth: waiterRoles,
					},
				)
				.post(
					"/waiter/idle",
					async (ctx) => {
						if (!ctx.profile) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not found",
								timestamp: Date.now(),
								success: false,
							});
						}

						await matchingService.setWaiterIdle(ctx.profile.id);

						return ctx.status(200, {
							status: 200,
							data: null,
							message: "Set to idle mode",
							timestamp: Date.now(),
							success: true,
						});
					},
					{
						response: {
							200: baseResponseSchema(t.Null()),
							400: errorResponseSchema,
						},
						roleAuth: waiterRoles,
					},
				)
				.get(
					"/waiter/status",
					async (ctx) => {
						if (!ctx.profile) {
							return ctx.status(400, {
								status: 400,
								message: "Profile not found",
								timestamp: Date.now(),
								success: false,
							});
						}

						const status = matchingService.getWaiterStatus(
							ctx.profile.id,
						);
						const roles = matchingService.getWaiterRoles(
							ctx.profile.id,
						);

						return ctx.status(200, {
							status: 200,
							data: {
								status,
								roles,
							},
							message: "Waiter status retrieved",
							timestamp: Date.now(),
							success: true,
						});
					},
					{
						response: {
							200: baseResponseSchema(
								t.Object({
									status: t.Union([
										t.Literal("idle"),
										t.Literal("working"),
										t.Literal("busy"),
									]),
									roles: t.Array(t.String()),
								}),
							),
							400: errorResponseSchema,
						},
						roleAuth: waiterRoles,
					},
				),
	);
