// ALERT: user table only for auth, profile table for user data

import { relations } from "drizzle-orm";
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
export const permissionEnum = pgEnum("permission", [
	"user",
	"listener",
	"psychologist",
	"therapist",
	"manager",
	"admin",
]);
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
	permission: permissionEnum().array().default(["user"]).notNull(),

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

export const chattingRoom = pgTable("chatting_room", {
	id: text("id").primaryKey(),
	participantIds: text("participant_ids").notNull().array().default([]),

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
	profile,
	userRequest,
	chattingRoom,
	AppState,
} as const;

// export const relation = defineRelations(schema, (r) => ({
// 	user: {
// 		profile: r.one.profile({
// 			from: r.user.id,
// 			to: r.profile.userId,
// 		}),
// 	},
// 	profile: {
// 		user: r.one.user({
// 			from: r.profile.userId,
// 			to: r.user.id,
// 		}),
// 		request: r.many.userRequest({
// 			from: r.profile.id,
// 			to: r.userRequest.profileId,
// 		}),
// 		chattingRoom: r.many.chattingRoom({
// 			from: r.profile.id,
// 			to: r.chattingRoom.participantIds,
// 		}),
// 	},
// 	userRequest: {
// 		profile: r.one.profile({
// 			from: r.userRequest.profileId,
// 			to: r.profile.id,
// 		}),
// 		chattingRoom: r.one.chattingRoom({
// 			from: r.userRequest.chatId,
// 			to: r.chattingRoom.id,
// 		}),
// 	},
// 	chattingRoom: {
// 		participant: r.many.profile({
// 			from: r.chattingRoom.participantIds,
// 			to: r.profile.id,
// 		}),
// 	},
// }));
