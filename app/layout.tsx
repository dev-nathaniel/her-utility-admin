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
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Price Buddy Admin | Utility Management & Broker CRM",
  description: "Price Buddy Broker CRM for business utility contracts, OCR bill scans, and concierge support.",
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
          <QueryProvider>
            <ErrorBoundary>
              <AuthProvider>
                <WebSocketProvider>
                  <Suspense
                    fallback={
                      <div className="flex min-h-screen items-center justify-center bg-background">
                        <div className="text-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                          <p className="mt-3 text-sm text-muted-foreground font-medium">Loading Price Buddy Admin...</p>
                        </div>
                      </div>
                    }
                  >
                    <SearchProvider>{children}</SearchProvider>
                  </Suspense>
                  <Toaster richColors position="top-right" />
                </WebSocketProvider>
              </AuthProvider>
            </ErrorBoundary>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
