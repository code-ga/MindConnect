import Elysia from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { db } from "../database";
import { schema } from "../database/schema";
import { arrayContains, eq } from "drizzle-orm";
import { Type } from "@sinclair/typebox";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { dbSchemaTypes } from "../database/type";

export const chatroomRouter = new Elysia({
	prefix: "/chatroom",
	detail: { description: "Chatroom Routes", tags: ["Chatroom"] },
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
					const chatrooms = await db
						.select()
						.from(schema.chattingRoom)
						.where(
							arrayContains(schema.chattingRoom.participantIds, [
								ctx.profile.id,
							]),
						);
					return ctx.status(200, {
						status: 200,
						data: chatrooms,
						message: "Chatrooms fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object(dbSchemaTypes.chattingRoom)),
						),
						400: errorResponseSchema,
					},
				},
			)
			.get(
				"/:id",
				async (ctx) => {
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					const chatroom = await db
						.select()
						.from(schema.chattingRoom)
						.where(eq(schema.chattingRoom.id, ctx.params.id));
					if (!chatroom || !chatroom[0]) {
						return ctx.status(404, {
							status: 404,
							message: "Chatroom not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					if (!chatroom[0].participantIds.includes(ctx.profile.id)) {
						return ctx.status(403, {
							status: 403,
							message: "You are not a participant of this chatroom",
							timestamp: Date.now(),
							success: false,
						});
					}
					return ctx.status(200, {
						status: 200,
						data: chatroom[0],
						message: "Chatroom fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(Type.Object(dbSchemaTypes.chattingRoom)),
						400: errorResponseSchema,
						403: errorResponseSchema,
						404: errorResponseSchema,
					},
				},
			)
			.get(
				"/:id/messages",
				async (ctx) => {
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					const chatroom = await db
						.select()
						.from(schema.chattingRoom)
						.where(eq(schema.chattingRoom.id, ctx.params.id));
					if (!chatroom || !chatroom[0]) {
						return ctx.status(404, {
							status: 404,
							message: "Chatroom not found",
							timestamp: Date.now(),
							success: false,
						});
					}
					if (!chatroom[0].participantIds.includes(ctx.profile.id)) {
						return ctx.status(403, {
							status: 403,
							message: "You are not a participant of this chatroom",
							timestamp: Date.now(),
							success: false,
						});
					}
					const messages = await db
						.select()
						.from(schema.chatRoomMessage)
						.where(eq(schema.chatRoomMessage.chatRoomId, ctx.params.id));
					return ctx.status(200, {
						status: 200,
						data: messages,
						message: "Messages fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object(dbSchemaTypes.chatRoomMessage)),
						),
						400: errorResponseSchema,
						403: errorResponseSchema,
						404: errorResponseSchema,
					},
				},
			),
	);
