import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { QueryProvider } from "@/lib/query-provider"
import { SearchProvider } from "@/lib/search-provider"
import { WebSocketProvider } from "@/lib/websocket-provider"
import { Toaster } from "sonner"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "CRM Admin Dashboard",
  description: "Comprehensive CRM dashboard for customer and contract management",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <QueryProvider>
              <WebSocketProvider>
                <Suspense fallback={<div>Loading...</div>}>
                  <SearchProvider>{children}</SearchProvider>
                </Suspense>
                <Toaster richColors position="top-right" />
              </WebSocketProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
