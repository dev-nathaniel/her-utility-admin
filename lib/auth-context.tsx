"use client"
import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, axiosInstance } from "./api-client"
import { toast } from "sonner"

export interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  fullname: string
  role: string
  businesses: string[]
  sites: string[]
  profilePicture: string | null
  createdAt: string
  updatedAt: string
}

interface AuthCredentials {
  email: string
  password: string
  firstName?: string
  lastName?: string
  name?: string
}

interface AuthContextType {
  user: User | null
  login: (data: AuthCredentials) => Promise<void>
  signup: (data: AuthCredentials) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function extractUser(response: unknown): User | null {
  if (!response || typeof response !== "object") return null
  const obj = response as Record<string, unknown>
  if (obj.data && typeof obj.data === "object" && "user" in (obj.data as Record<string, unknown>)) {
    return (obj.data as Record<string, unknown>).user as User
  }
  if ("user" in obj) return obj.user as User
  return null
}

function extractToken(response: unknown): string | null {
  if (!response || typeof response !== "object") return null
  const obj = response as Record<string, unknown>
  const inner = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj
  return (inner?.token as string) || null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch current user
  const { data: userResponse, isLoading, isError } = useQuery({
    queryKey: ["user"],
    queryFn: apiClient.getCurrentUser,
    retry: false,
    staleTime: Infinity, // User data shouldn't go stale quickly unless we mutate it
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: apiClient.login,
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Login failed")
    },
  })

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: apiClient.signup,
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Signup failed")
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      delete axiosInstance.defaults.headers.common["Authorization"]
      queryClient.setQueryData(["user"], null)
      queryClient.removeQueries({ queryKey: ["user"] })
      router.push("/login")
      toast.success("Logged out successfully")
    },
    onError: () => {
      // Even if logout fails on server, we clear local state
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      delete axiosInstance.defaults.headers.common["Authorization"]
      queryClient.setQueryData(["user"], null)
      queryClient.removeQueries({ queryKey: ["user"] })
      router.push("/login")
    },
  })

  const login = async (data: AuthCredentials) => {
    const result = await loginMutation.mutateAsync(data)
    const token = extractToken(result)
    if (token) {
      document.cookie = `auth-token=${token}; path=/; max-age=86400; SameSite=Lax`
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
    queryClient.setQueryData(["user"], result)
    toast.success("Login successful!")
    window.location.href = "/dashboard"
  }

  const signup = async (data: AuthCredentials) => {
    const result = await signupMutation.mutateAsync(data)
    const token = extractToken(result)
    if (token) {
      document.cookie = `auth-token=${token}; path=/; max-age=86400; SameSite=Lax`
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
    queryClient.setQueryData(["user"], result)
    toast.success("Account created successfully!")
    window.location.href = "/dashboard"
  }

  const logout = async () => {
    await logoutMutation.mutateAsync()
  }

  return (
    <AuthContext.Provider
      value={{
        user: extractUser(userResponse),
        login,
        signup,
        logout,
        isAuthenticated: !!extractUser(userResponse),
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
