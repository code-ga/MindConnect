import Elysia from "elysia";
import { auth } from "../libs/auths/auth.config";

const betterAuthRouter = new Elysia({
	name: "better-auth",
	prefix: "/auth",
}).mount(auth.handler);

export { betterAuthRouter };
