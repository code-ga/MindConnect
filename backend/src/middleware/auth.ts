import Elysia from "elysia";
import { auth } from "../libs/auths/auth.config";
import { eq } from "drizzle-orm";
import { db } from "../database";
import { schema } from "../database/schema";

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
	agentAuth: {
		async resolve({ status, request: { headers } }) {
			const authenticationHeader = headers.get("Authorization");
			if (!authenticationHeader || !authenticationHeader.startsWith("Bot ")) {
				return status(401);
			}
			const token = authenticationHeader.replace("Bot ", "").trim();
			const agent = await db
				.select()
				.from(schema.clusterAgent)
				.where(eq(schema.clusterAgent.token, token))
				.limit(1);
			if (agent.length === 0 || !agent[0]) {
				return status(401);
			}
			const cluster = await db
				.select()
				.from(schema.k8sCluster)
				.where(eq(schema.k8sCluster.agentId, agent[0].id))
				.limit(1);
			if (cluster.length === 0 || !cluster[0]) {
				return status(401);
			}
			return {
				agent: agent[0],
				cluster: cluster[0],
			};
		},
	},
});
