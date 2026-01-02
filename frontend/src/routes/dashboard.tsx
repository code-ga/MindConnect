import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/auth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: Dashboard,
})

function Dashboard() {
  const { data: session } = authClient.useSession()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full p-8 bg-card rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">
          Hello {session?.user?.name || session?.user?.email}!
        </p>
        <div className="mt-6">
          <button
            onClick={async () => {
              await authClient.signOut()
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
