import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/auth-queries'
import { useAuth } from '@/components/auth-context'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth,
  component: Dashboard,
})

function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full p-8 bg-card rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">
          Hello {user?.name || user?.email}!
        </p>
        <div className="mt-6">
          <button
            onClick={async () => {
              await signOut()
              window.location.href = '/login'
            }}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
