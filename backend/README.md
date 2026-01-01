# K8s Dashboard Backend

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime installed

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env` file in the root:

```env
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=bun.sqlite
NODE_ENV=development
```

### Development

```bash
bun run dev
```

### Database Migrations

```bash
bun run db:push
bun run db:studio
```

## Project Structure

```
src/
├── index.ts          # Main entry point
├── app.ts            # Elysia app setup
├── auth/             # Authentication setup
├── routes/           # API routes
│   ├── auth.ts       # Auth routes
│   └── health.ts     # Health check routes
└── db/               # Database setup
    ├── index.ts      # DB instance
    └── schema.ts     # Drizzle schema
```

## Features

- ✅ Bun.js runtime
- ✅ Elysia web framework
- ✅ Better Auth (Email/Password, OAuth ready)
- ✅ Drizzle ORM with SQLite
- ✅ TypeScript support
- ✅ Health check endpoints

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `POST /auth/sign-up` - Sign up with email
- `POST /auth/sign-in` - Sign in with email
- `POST /auth/sign-out` - Sign out
- `GET /auth/session` - Get current session
