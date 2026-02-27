// ALERT: user table only for auth, profile table for user data

import { defineRelations } from "drizzle-orm";
import {
	boolean,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
export const role = pgTable("role", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull().unique(),
	description: text("description"),
	scope: text("scope").notNull().default("system"), // "system" | "chatroom"
	isMatchable: boolean("is_matchable").notNull().default(false),
	isDefault: boolean("is_default").notNull().default(false),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const rolePermission = pgTable("role_permission", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	roleId: text("role_id")
		.notNull()
		.references(() => role.id, { onDelete: "cascade" }),
	resource: text("resource").notNull(),
	action: text("action").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const profile = pgTable("profile", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" })
		.unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),

	username: text("username").notNull(),
	permission: text("permission").array().default(["user"]).notNull(),

	lastSeen: timestamp("last_seen").defaultNow().notNull(),
	isMatching: boolean("is_matching").default(false).notNull(),
	matchingRoles: text("matching_roles").array().default([]).notNull(),

	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
export const requestType = pgEnum("request_type", [
	"role_request",
	"feature_request",
]);
export const requestStatus = pgEnum("request_status", [
	"pending",
	"processing",
	"accepted",
	"rejected",
]);
export const userRequest = pgTable("request", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	profileId: text("profile_id")
		.notNull()
		.references(() => profile.id, { onDelete: "cascade" }),

	status: requestStatus("status").notNull().default("pending"),
	content: text("content").notNull(),
	processedAt: timestamp("processed_at"),
	processedBy: text("processed_by").references(() => profile.id, {
		onDelete: "cascade",
	}),
	processedReason: text("processed_reason"),
	processedNote: text("processed_note"),
	chatId: text("chat_id").references(() => chattingRoom.id, {
		onDelete: "cascade",
	}),
	type: requestType("type").notNull().default("role_request"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const chatRoomStatus = pgEnum("chat_room_status", [
	"active",
	"archived",
]);

export const chatRoomType = pgEnum("chat_room_type", [
	"private-chat-for-support",
	"private-chat-for-therapy",
	"group-chat-for-support",
	"group-chat-for-therapy",
	"public-chat-room",
]);

export const chattingRoom = pgTable("chatting_room", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name"),
	participantIds: text("participant_ids").notNull().array().default([]),
	isHiddenParticipantProfile: boolean("is_hidden_participant_profile")
		.notNull()
		.default(false),
	status: chatRoomStatus("status").notNull().default("active"),
	type: chatRoomType("type").notNull().default("private-chat-for-support"),
	isGroupChat: boolean("is_group_chat").notNull().default(false),
	ownerId: text("owner_id")
		.notNull()
		.references(() => profile.id, {
			onDelete: "cascade",
		}),

	description: text("description"),

	archivedAt: timestamp("archived_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const chatRoomRoleAssignment = pgTable("chat_room_role_assignment", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	chatRoomId: text("chat_room_id")
		.notNull()
		.references(() => chattingRoom.id, { onDelete: "cascade" }),
	profileId: text("profile_id")
		.notNull()
		.references(() => profile.id, { onDelete: "cascade" }),
	roleId: text("role_id")
		.notNull()
		.references(() => role.id, { onDelete: "cascade" }),
	assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

export const chatRoomMessage = pgTable("chat_room_message", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	chatRoomId: text("chat_room_id")
		.notNull()
		.references(() => chattingRoom.id, {
			onDelete: "cascade",
		}),
	senderId: text("sender_id")
		.notNull()
		.references(() => profile.id, {
			onDelete: "cascade",
		}),
	content: text("content").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const notification = pgTable("notification", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	profileId: text("profile_id")
		.notNull()
		.references(() => profile.id, { onDelete: "cascade" }),
	type: text("type").notNull(), // e.g., 'role_added', 'message_received'
	content: text("content").notNull(),
	readStatus: boolean("read_status").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export interface AppState {
	createNewAdmin: boolean;
}

export const AppState = pgTable("app_state", {
	id: serial("id").primaryKey(),

	state: jsonb("state").notNull().$type<AppState>().default({
		createNewAdmin: true,
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const schema = {
	user,
	session,
	account,
	verification,
	role,
	rolePermission,
	profile,
	chatRoomRoleAssignment,
	userRequest,
	chattingRoom,
	chatRoomMessage,
	notification,
	AppState,
} as const;

export const relations = defineRelations(schema, (r) => ({
	user: {
		profile: r.one.profile({
			from: r.user.id,
			to: r.profile.userId,
		}),
	},
	profile: {
		user: r.one.user({
			from: r.profile.userId,
			to: r.user.id,
		}),
		request: r.many.userRequest({
			from: r.profile.id,
			to: r.userRequest.profileId,
		}),
		chattingRoom: r.many.chattingRoom({
			from: r.profile.id,
			to: r.chattingRoom.participantIds,
		}),
		notifications: r.many.notification({
			from: r.profile.id,
			to: r.notification.profileId,
		}),
	},
	userRequest: {
		profile: r.one.profile({
			from: r.userRequest.profileId,
			to: r.profile.id,
		}),
		chattingRoom: r.one.chattingRoom({
			from: r.userRequest.chatId,
			to: r.chattingRoom.id,
		}),
	},
	chattingRoom: {
		participant: r.many.profile({
			from: r.chattingRoom.participantIds,
			to: r.profile.id,
		}),
		message: r.many.chatRoomMessage({
			from: r.chattingRoom.id,
			to: r.chatRoomMessage.chatRoomId,
		}),
		owner: r.one.profile({
			from: r.chattingRoom.ownerId,
			to: r.profile.id,
		}),
	},
	chatRoomMessage: {
		chattingRoom: r.one.chattingRoom({
			from: r.chatRoomMessage.chatRoomId,
			to: r.chattingRoom.id,
		}),
		sender: r.one.profile({
			from: r.chatRoomMessage.senderId,
			to: r.profile.id,
		}),
	},
	notification: {
		profile: r.one.profile({
			from: r.notification.profileId,
			to: r.profile.id,
		}),
	},
}));
