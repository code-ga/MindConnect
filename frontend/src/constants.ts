export const BACKEND_URL =
	import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
export const LOGIN_REDIRECT_URL = `${import.meta.env.VITE_APP_URL || "http://localhost:3000"}/dashboard`;
