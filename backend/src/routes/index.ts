import Elysia from "elysia";
import { betterAuthRouter } from "./auth";
import { healthRoutes } from "./health";
import { agentManagerService } from "../services/agentManager";
import { profileRouter } from "./profile";

const apiRouter = new Elysia({ prefix: "/api" })
	.use(agentManagerService)
	.use(betterAuthRouter)
	.use(healthRoutes)
	.use(profileRouter)

export { apiRouter };
