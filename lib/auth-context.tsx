"use client"
import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, axiosInstance, type UserData } from "./api-client"
import { toast } from "sonner"

export interface User extends UserData {
  _id: string
  fullname: string
}

interface AuthCredentials {
  email: string
  password: string
  full_name?: string
  name?: string
  company_name?: string
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
  let rawUser: any = null

  if (obj.user && typeof obj.user === "object") {
    rawUser = obj.user
  } else if (obj.data && typeof obj.data === "object") {
    const d = obj.data as Record<string, unknown>
    if (d.user && typeof d.user === "object") {
      rawUser = d.user
    } else if (d.id || d.email) {
      rawUser = d
    }
  } else if (obj.id || obj.email) {
    rawUser = obj
  }

  if (rawUser) {
    return {
      ...rawUser,
      _id: rawUser.id || rawUser._id,
      fullname: rawUser.full_name || rawUser.fullname || rawUser.email,
    } as User
  }

  return null
}

function extractToken(response: unknown): string | null {
  if (!response || typeof response !== "object") return null
  const obj = response as Record<string, unknown>
  if (obj.token && typeof obj.token === "string") return obj.token
  const inner = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj
  return (inner?.token as string) || (inner?.access_token as string) || null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch current user
  const { data: userResponse, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: apiClient.getCurrentUser,
    retry: false,
    staleTime: 60000,
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: apiClient.login,
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; message?: string } } }
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Login failed")
    },
  })

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: apiClient.signup,
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string; message?: string } } }
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Signup failed")
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token")
      }
      delete axiosInstance.defaults.headers.common["Authorization"]
      queryClient.setQueryData(["user"], null)
      queryClient.removeQueries({ queryKey: ["user"] })
      router.push("/login")
      toast.success("Logged out successfully")
    },
    onError: () => {
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token")
      }
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
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-token", token)
      }
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
    const currentUser = extractUser(result) || (await apiClient.getCurrentUser())
    queryClient.setQueryData(["user"], currentUser)
    toast.success("Login successful!")
    window.location.href = "/dashboard"
  }

  const signup = async (data: AuthCredentials) => {
    const result = await signupMutation.mutateAsync(data)
    const token = extractToken(result)
    if (token) {
      document.cookie = `auth-token=${token}; path=/; max-age=86400; SameSite=Lax`
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-token", token)
      }
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
    const currentUser = extractUser(result) || (await apiClient.getCurrentUser())
    queryClient.setQueryData(["user"], currentUser)
    toast.success("Account created successfully!")
    window.location.href = "/dashboard"
  }

  const logout = async () => {
    await logoutMutation.mutateAsync()
  }

  const currentUser = extractUser(userResponse)

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        login,
        signup,
        logout,
        isAuthenticated: !!currentUser,
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
