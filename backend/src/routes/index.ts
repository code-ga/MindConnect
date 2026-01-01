import Elysia from "elysia";
import { betterAuthRouter } from "./auth";
import { healthRoutes } from "./health";

const apiRouter = new Elysia()
  .use(betterAuthRouter)
  .use(healthRoutes)

export { apiRouter };