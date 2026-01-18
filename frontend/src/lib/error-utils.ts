/**
 * Extracts a human-readable error message from an Elysia Eden error object.
 */
export function getErrorMessage(error: unknown): string {
	if (!error || typeof error !== "object") return "An unknown error occurred";

	// Check if it's an Eden error object with a 'value' property
	if ("value" in error) {
		const errVal = error.value;
		if (!errVal) return "An unknown error occurred";

		if (typeof errVal === "string") return errVal;

		if (typeof errVal === "object") {
			const obj = errVal as Record<string, unknown>;
			if (typeof obj.message === "string") return obj.message;
			if (typeof obj.summary === "string") return obj.summary;
			return JSON.stringify(errVal);
		}
	}

	// Check for standard Error object
	if (error instanceof Error) return error.message;

	// Fallback for objects with message property
	const obj = error as Record<string, unknown>;
	if (typeof obj.message === "string") return obj.message;

	return "An unknown error occurred";
}
