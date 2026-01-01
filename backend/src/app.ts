import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";

const app = new Elysia()
  .get("/", () => ({
    message: "K8s Dashboard Backend",
    version: "1.0.0",
  }))
  .use(authRoutes)
  .use(healthRoutes)
  .listen(3000);

console.log("🦊 Elysia Server running on http://localhost:3000");
console.log("📦 Database: bun.sqlite");
console.log("🔐 Auth: Better Auth configured");
