export const FRONTEND_URLs = [
	"http://localhost:3000",
	...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : []),
];
