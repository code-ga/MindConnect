import type { App } from "@api/index";
import { BACKEND_URL } from "@/constants";
import { treaty } from "@elysiajs/eden";

export const api = treaty<App>(BACKEND_URL, {
	fetch: {
		credentials: "include",
	},
});
export type { databaseTypes } from "@api/index";
