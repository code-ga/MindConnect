export const BACKEND_URL =
	import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
export const LOGIN_REDIRECT_URL = `${import.meta.env.VITE_APP_URL || "http://localhost:5174"}/dashboard`;
