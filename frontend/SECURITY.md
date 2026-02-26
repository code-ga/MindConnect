# Frontend Security Implementation

## Overview
This document outlines the security measures implemented in the MindConnect frontend application to protect user data and ensure secure access control.

## Security Features

### 1. Content Security Policy (CSP)
Implemented in `index.html` to prevent XSS attacks and control resource loading:

- **default-src 'self'**: Only same-origin resources allowed by default
- **script-src 'self' 'wasm-unsafe-eval'**: Scripts from same origin only, with WASM support
- **style-src 'self' 'unsafe-inline'**: Styles from same origin and inline (for Tailwind)
- **img-src 'self' data: https:** Images from same origin, data URIs, and HTTPS
- **connect-src 'self' http://localhost:3000 https:** API calls to same origin and backend
- **font-src 'self'**: Fonts from same origin only
- **frame-ancestors 'none'**: Prevent framing/clickjacking

### 2. Additional Security Headers
- **X-Content-Type-Options: nosniff**: Prevent MIME type sniffing
- **X-Frame-Options: DENY**: Prevent clickjacking attacks
- **X-XSS-Protection: 1; mode=block**: Enable XSS protection in legacy browsers
- **Referrer-Policy: strict-origin-when-cross-origin**: Control referrer information

### 3. Authentication Middleware

#### ProtectedRoute Component
Located in `src/components/ProtectedRoute.tsx`, provides route-level access control:

```tsx
<ProtectedRoute
  requireAuth={true}
  requireProfile={true}
  requiredPermissions={["admin"]}
>
  <AdminPanel />
</ProtectedRoute>
```

**Configuration Options:**
- `requireAuth`: Redirect to `/login` if not authenticated
- `requireProfile`: Redirect to `/profile/create` if profile not created
- `requiredPermissions`: Array of required permissions, redirects to `/unauthorized` if not met
- `fallback`: Custom loading/error component
- `redirectTo`: Custom redirect destination (default: `/login`)

#### useAuthRoute Hook
For component-level auth checks:

```tsx
const { user, profile, loading, isAuthenticated } = useAuthRoute({
  requireAuth: true,
  requireProfile: true,
  requiredPermissions: ["listener", "psychologist"]
});
```

### 4. Protected Routes

The following routes are protected with authentication middleware:

| Route | Requirements | Purpose |
|-------|--------------|---------|
| `/chat` | Auth + Profile | View and manage chat rooms |
| `/chat/$id` | Auth + Profile | Access specific chat room |
| `/requests` | Auth + Profile | View user requests |
| `/requests/new` | Auth + Profile | Create new request |
| `/settings` | Auth + Profile | User settings |
| `/admin/users` | Auth + Profile + Admin | Manage users (Admin only) |
| `/admin/requests` | Auth + Profile + Admin | Manage requests (Admin only) |
| `/profile/create` | Auth only | Create user profile |
| `/login` | Public | Login page |
| `/` | Public | Home page |
| `/unauthorized` | Public | Unauthorized access page |

### 5. Root Route Middleware (`__root.tsx`)
Implements automatic redirects:

```typescript
// Redirects unauthenticated users to /login (except public routes)
// Redirects authenticated users without profile to /profile/create
// Shows loading state during auth check
```

**Public Routes:**
- `/login`
- `/` (home)
- `/unauthorized`

### 6. Permission System

Three permission levels implemented:
- **user**: Basic user with access to messaging
- **helper roles**: `listener`, `psychologist`, `therapist` - can offer support
- **admin**: Full system access including user and request management

**Permission Check:**
```tsx
const { profile, hasPermission } = useAuth();

// Check single permission
if (hasPermission(["listener"])) {
  // User is a listener
}

// Check multiple permissions (OR logic)
if (hasPermission(["listener", "psychologist", "therapist"])) {
  // User is any type of helper
}
```

### 7. Session Management

- Sessions managed via `better-auth` library
- Session state persisted in React Query cache
- Automatic session restoration on page reload
- Sign out clears both user and profile data from cache
- Heartbeat mechanism via WebSocket to maintain session

### 8. Unauthorized Page
Custom `/unauthorized` route (404 style) for:
- Users accessing restricted routes without permissions
- Provides navigation back to allowed areas
- Professional error handling

## Best Practices

### When Adding New Routes

1. **Identify Auth Requirements:**
   ```tsx
   export const Route = createFileRoute("/my-route")({
     component: MyRoutePage,
   });

   function MyRoutePage() {
     return (
       <ProtectedRoute
         requireAuth={true}
         requireProfile={true}
         requiredPermissions={["admin"]} // if needed
       >
         <MyRoute />
       </ProtectedRoute>
     );
   }
   ```

2. **For Public Routes:**
   No ProtectedRoute wrapper needed (login, home, etc.)

3. **For Admin Routes:**
   ```tsx
   <ProtectedRoute
     requireAuth={true}
     requireProfile={true}
     requiredPermissions={["admin"]}
   >
     <AdminComponent />
   </ProtectedRoute>
   ```

4. **For Helper-Only Routes:**
   ```tsx
   <ProtectedRoute
     requireAuth={true}
     requireProfile={true}
     requiredPermissions={["listener", "psychologist", "therapist"]}
   >
     <HelperComponent />
   </ProtectedRoute>
   ```

### API Security

1. **Authentication Headers:**
   - All API requests include session token via `better-auth`
   - Tokens are HTTP-only (not accessible via JavaScript)

2. **CORS:**
   - Configured on backend to allow frontend origin only
   - Prevents cross-site requests

3. **Rate Limiting:**
   - Implement on backend for API endpoints
   - Prevents brute force attacks

## Security Checklist

- [x] CSP headers implemented
- [x] CORS configured (backend)
- [x] Route-level auth middleware
- [x] Permission-based access control
- [x] Unauthorized page for access denial
- [x] Session management via better-auth
- [x] Secure headers (X-Frame-Options, etc.)
- [x] API token handling (HTTP-only)
- [ ] HTTPS enforcement (production config)
- [ ] Rate limiting (backend)
- [ ] Input validation (form level)
- [ ] SQL injection prevention (backend - ORM used)

## Environment Variables

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:3000/api
```

**Never commit `.env.local`** - add to `.gitignore`

## Testing Security

1. **Test Unauthenticated Access:**
   ```bash
   # Try accessing /chat without logging in
   # Should redirect to /login
   ```

2. **Test Permission Checks:**
   ```bash
   # Create a user without admin permission
   # Try accessing /admin/users
   # Should show /unauthorized page
   ```

3. **Test Session Persistence:**
   ```bash
   # Log in, refresh page
   # Should maintain session
   ```

4. **Test CSP:**
   ```bash
   # Open DevTools Console
   # Should not see CSP violation warnings
   ```

## References

- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [better-auth Documentation](https://www.better-auth.com/)
- [TanStack Router Docs](https://tanstack.com/router/latest)
