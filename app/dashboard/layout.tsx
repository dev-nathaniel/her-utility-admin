import type React from "react"
import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<div className="flex h-96 items-center justify-center text-sm text-muted-foreground"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />Loading...</div>}>
          {children}
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
