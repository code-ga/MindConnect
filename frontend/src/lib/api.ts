import type { App } from "@mindconnect/backend";
import { BACKEND_URL } from "@/constants";
import { treaty } from "@elysiajs/eden";

export const api = treaty<App>(BACKEND_URL, {
	fetch: {
		credentials: "include",
	},
});
export type { databaseTypes } from "@mindconnect/backend";
