import Elysia from "elysia";
import { betterAuthRouter } from "./auth";
import { healthRoutes } from "./health";
import { agentManagerService } from "../services/agentManager";
import { profileRouter } from "./profile";
import { userRequestRouter } from "./user-request";
import { chatroomRouter } from "./chatroom";
import { notificationRouter } from "./notification";
import { matchRouter } from "./match";
import { roleRouter } from "./role";

const apiRouter = new Elysia({ prefix: "/api" })
	.use(agentManagerService)
	.use(betterAuthRouter)
	.use(healthRoutes)
	.use(profileRouter)
	.use(userRequestRouter)
	.use(chatroomRouter)
	.use(notificationRouter)
	.use(matchRouter)
	.use(roleRouter);

export { apiRouter };
