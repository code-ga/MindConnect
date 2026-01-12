import Elysia, { type Static } from "elysia";
import { auth } from "../libs/auths/auth.config";
import { db } from "../database";
import { eq } from "drizzle-orm";
import { schema } from "../database/schema";
import type { dbSchemaTypes } from "../database/type";

export const authenticationMiddleware = new Elysia({
	name: "authentication",
}).macro({
	userAuth: {
		async resolve({ status, request: { headers } }) {
			const session = await auth.api.getSession({
				headers,
			});

			if (!session) return status(401);

			return {
				user: session.user,
				session: session.session,
			};
		},
	},

	roleAuth: (permissions: Static<typeof dbSchemaTypes.profile.permission>) => ({
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

			const userPermissions = userProfile[0].permission;
			if (!userPermissions) return status(401);
			if (userPermissions.includes("admin"))
				return {
					user: session.user,
					session: session.session,
					permission: userPermissions,
					profile: userProfile[0],
				};
			// if all permissions are in userPermissions return true
			if (
				permissions &&
				Array.isArray(permissions) &&
				permissions.every((permission) => userPermissions.includes(permission))
			)
				return {
					user: session.user,
					session: session.session,
					permission: userPermissions,
					profile: userProfile[0],
				};
			return status(403);
		},
	}),
});
