import Elysia from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { db } from "../database";
import { schema } from "../database/schema";
import { arrayContains, eq, and, inArray, not } from "drizzle-orm";
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

					const conditions = [
						arrayContains(schema.chattingRoom.participantIds, [ctx.profile.id]),
					];

					if (ctx.query.category) {
						if (ctx.query.category === "support") {
							conditions.push(
								inArray(schema.chattingRoom.type, [
									"private-chat-for-support",
									"group-chat-for-support",
								]),
							);
						} else if (ctx.query.category === "therapy") {
							conditions.push(
								inArray(schema.chattingRoom.type, [
									"private-chat-for-therapy",
									"group-chat-for-therapy",
								]),
							);
						} else if (ctx.query.category === "public") {
							conditions.push(eq(schema.chattingRoom.type, "public-chat-room"));
						}
					}

					const chatrooms = await db
						.select()
						.from(schema.chattingRoom)
						.where(and(...conditions));

					return ctx.status(200, {
						status: 200,
						data: chatrooms,
						message: "Chatrooms fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					query: Type.Object({
						category: Type.Optional(
							Type.Union([
								Type.Literal("all"),
								Type.Literal("support"),
								Type.Literal("therapy"),
								Type.Literal("public"),
							]),
						),
					}),
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object(dbSchemaTypes.chattingRoom)),
						),
						400: errorResponseSchema,
					},
				},
			)
			.get(
				"/discover",
				async (ctx) => {
					if (!ctx.profile) {
						return ctx.status(400, {
							status: 400,
							message: "Profile not found",
							timestamp: Date.now(),
							success: false,
						});
					}

					const conditions = [
						eq(schema.chattingRoom.isGroupChat, true),
						not(
							arrayContains(schema.chattingRoom.participantIds, [
								ctx.profile.id,
							]),
						),
					];

					if (ctx.query.category) {
						if (ctx.query.category === "support") {
							conditions.push(
								inArray(schema.chattingRoom.type, ["group-chat-for-support"]),
							);
						} else if (ctx.query.category === "therapy") {
							conditions.push(
								inArray(schema.chattingRoom.type, ["group-chat-for-therapy"]),
							);
						} else if (ctx.query.category === "public") {
							conditions.push(eq(schema.chattingRoom.type, "public-chat-room"));
						}
					}

					const chatrooms = await db
						.select()
						.from(schema.chattingRoom)
						.where(and(...conditions));

					return ctx.status(200, {
						status: 200,
						data: chatrooms,
						message: "Discoverable chatrooms fetched successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					query: Type.Object({
						category: Type.Optional(
							Type.Union([
								Type.Literal("all"),
								Type.Literal("support"),
								Type.Literal("therapy"),
								Type.Literal("public"),
							]),
						),
					}),
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
			)
			.post(
				"/:id/join",
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

					// Allow joining public chat rooms or group chats
					if (
						chatroom[0].type !== "public-chat-room" &&
						!chatroom[0].isGroupChat
					) {
						return ctx.status(403, {
							status: 403,
							message: "Cannot join this type of chat room",
							timestamp: Date.now(),
							success: false,
						});
					}

					if (chatroom[0].participantIds.includes(ctx.profile.id)) {
						return ctx.status(400, {
							status: 400,
							message: "Already a participant",
							timestamp: Date.now(),
							success: false,
						});
					}

					await db
						.update(schema.chattingRoom)
						.set({
							participantIds: [...chatroom[0].participantIds, ctx.profile.id],
						})
						.where(eq(schema.chattingRoom.id, ctx.params.id));

					return ctx.status(200, {
						status: 200,
						data: null,
						message: "Joined chat room successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(Type.Null()),
						400: errorResponseSchema,
						403: errorResponseSchema,
						404: errorResponseSchema,
					},
				},
			)
			.post(
				"/:id/leave",
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
						return ctx.status(400, {
							status: 400,
							message: "Not a participant",
							timestamp: Date.now(),
							success: false,
						});
					}

					const newParticipants = chatroom[0].participantIds.filter(
						(id) => id !== ctx.profile?.id,
					);

					await db
						.update(schema.chattingRoom)
						.set({
							participantIds: newParticipants,
						})
						.where(eq(schema.chattingRoom.id, ctx.params.id));

					return ctx.status(200, {
						status: 200,
						data: null,
						message: "Left chat room successfully",
						timestamp: Date.now(),
						success: true,
					});
				},
				{
					response: {
						200: baseResponseSchema(Type.Null()),
						400: errorResponseSchema,
						404: errorResponseSchema,
					},
				},
			),
	)
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
			const chatroom = await db
				.insert(schema.chattingRoom)
				.values({
					name: ctx.body.name,
					isGroupChat: ctx.body.isGroupChat,
					participantIds: [ctx.profile.id],
					type: ctx.body.type,
					description: ctx.body.description,
					ownerId: ctx.profile.id,
				})
				.returning();
			if (!chatroom || !chatroom[0]) {
				return ctx.status(400, {
					status: 400,
					message: "Failed to create chatroom",
					timestamp: Date.now(),
					success: false,
				});
			}
			return ctx.status(200, {
				status: 200,
				data: chatroom[0],
				message: "Chatroom created successfully",
				timestamp: Date.now(),
				success: true,
			});
		},
		{
			body: Type.Object({
				name: Type.String(),
				description: Type.String(),
				isGroupChat: Type.Boolean(),
				type: Type.Union([Type.Literal("public-chat-room")]),
			}),
			response: {
				200: baseResponseSchema(Type.Object(dbSchemaTypes.chattingRoom)),
				400: errorResponseSchema,
			},
		},
	);
