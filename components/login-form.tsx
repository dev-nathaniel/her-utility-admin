"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ShieldCheck, Loader2 } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login({ email, password })
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg border">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white font-extrabold text-lg shadow-md shadow-purple-500/20 ring-4 ring-purple-500/10">
          PB
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Price Buddy Admin</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Sign in to the broker utility management console
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. p5_uitest_@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In to Console"
            )}
          </Button>
        </form>

        <div className="mt-5 p-3 rounded-lg bg-muted/40 border text-center text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Broker credentials:</p>
          <p className="mt-0.5 font-mono text-[11px]">p5_uitest_@test.com / TestPass123!</p>
        </div>
      </CardContent>
    </Card>
  )
}
