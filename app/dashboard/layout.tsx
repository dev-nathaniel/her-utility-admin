import type React from "react"
import { DashboardLayout } from "@/components/dashboard/layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}
