import Elysia from "elysia";
import { auth } from "../libs/auths/auth.config";
import { db } from "../database";
import { and, eq, inArray } from "drizzle-orm";
import { schema } from "../database/schema";

// ============ RoleCondition DSL ============

export type RoleCondition =
	| { type: "any"; roles: string[] }
	| { type: "all"; roles: string[] }
	| { type: "resource"; resource: string; action: string }
	| { type: "and"; conditions: RoleCondition[] }
	| { type: "or"; conditions: RoleCondition[] };

export const c = {
	any: (...roles: string[]): RoleCondition => ({ type: "any", roles }),
	all: (...roles: string[]): RoleCondition => ({ type: "all", roles }),
	resource: (resource: string, action: string): RoleCondition => ({
		type: "resource",
		resource,
		action,
	}),
	and: (...conditions: RoleCondition[]): RoleCondition => ({
		type: "and",
		conditions,
	}),
	or: (...conditions: RoleCondition[]): RoleCondition => ({
		type: "or",
		conditions,
	}),
};

async function evaluateCondition(
	condition: RoleCondition,
	userRoles: string[],
): Promise<boolean> {
	switch (condition.type) {
		case "any":
			return condition.roles.some((r) => userRoles.includes(r));

		case "all":
			return condition.roles.every((r) => userRoles.includes(r));

		case "resource": {
			if (userRoles.length === 0) return false;
			const permissions = await db
				.select()
				.from(schema.rolePermission)
				.innerJoin(
					schema.role,
					eq(schema.rolePermission.roleId, schema.role.id),
				)
				.where(
					and(
						eq(schema.rolePermission.resource, condition.resource),
						eq(schema.rolePermission.action, condition.action),
						inArray(schema.role.name, userRoles),
					),
				);
			return permissions.length > 0;
		}

		case "and": {
			for (const sub of condition.conditions) {
				if (!(await evaluateCondition(sub, userRoles))) return false;
			}
			return true;
		}

		case "or": {
			for (const sub of condition.conditions) {
				if (await evaluateCondition(sub, userRoles)) return true;
			}
			return false;
		}
	}
}

// ============ Elysia Middleware ============

export const authenticationMiddleware = new Elysia({
	name: "authentication",
}).macro({
	userAuth: {
		async resolve({ status, request: { headers } }) {
			const session = await auth.api.getSession({
				headers,
			});

			if (!session) return status(401);
			const profile = await db
				.select()
				.from(schema.profile)
				.where(eq(schema.profile.userId, session.user.id));
			return {
				user: session.user,
				session: session.session,
				profile: profile[0],
			};
		},
		detail: {},
	},

	roleAuth: (condition: RoleCondition) => ({
		async resolve({ status, request: { headers } }) {
			const session = await auth.api.getSession({
				headers,
			});

			if (!session) return status(401);

			const userProfile = await db
				.select()
				.from(schema.profile)
				.where(eq(schema.profile.userId, session.user.id));
			if (!userProfile || !userProfile[0]) return status(401);

			const userRoles = userProfile[0].permission;
			if (!userRoles) return status(401);

			// Admin global bypass
			if (userRoles.includes("admin"))
				return {
					user: session.user,
					session: session.session,
					permission: userRoles,
					profile: userProfile[0],
				};

			const authorized = await evaluateCondition(condition, userRoles);
			if (!authorized) return status(403);

			return {
				user: session.user,
				session: session.session,
				permission: userRoles,
				profile: userProfile[0],
			};
		},
	}),
});
