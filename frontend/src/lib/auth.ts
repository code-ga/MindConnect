import { BACKEND_URL } from "@/constants"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: `${BACKEND_URL}/api/auth`,
})
