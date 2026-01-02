import Elysia from "elysia";
import { betterAuthRouter } from "./auth";
import { healthRoutes } from "./health";
import { clusterRoute } from "./cluster";

const apiRouter = new Elysia()
  .use(betterAuthRouter)
  .use(healthRoutes)
  .use(clusterRoute);

export { apiRouter };