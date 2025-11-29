"use client"
import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, axiosInstance } from "./api-client"
import { toast } from "sonner"

export interface User {
  _id: string
  email: string
  fullname: string
  role: string
  businesses: string[]
  sites: string[]
  profilePicture: string | null
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  login: (data: any) => Promise<void>
  signup: (data: any) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch current user
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user"],
    queryFn: apiClient.getCurrentUser,
    retry: false,
    staleTime: Infinity, // User data shouldn't go stale quickly unless we mutate it
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: apiClient.login,
    onSuccess: (data: any) => {
      console.log("Login successful, response data:", data)
      if (data.token) {
        document.cookie = `auth-token=${data.token}; path=/; max-age=86400; SameSite=Lax`
        // Set default header for immediate use
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${data.token}`
      }
      queryClient.invalidateQueries({ queryKey: ["user"] })
      toast.success("Login successful!")
      console.log("Redirecting to /dashboard")
      router.push("/dashboard")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Login failed")
    },
  })

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: apiClient.signup,
    onSuccess: (data: any) => {
      if (data.token) {
        document.cookie = `auth-token=${data.token}; path=/; max-age=86400; SameSite=Lax`
        // Set default header for immediate use
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${data.token}`
      }
      queryClient.invalidateQueries({ queryKey: ["user"] })
      toast.success("Account created successfully!")
      router.push("/dashboard")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Signup failed")
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      delete axiosInstance.defaults.headers.common["Authorization"]
      queryClient.setQueryData(["user"], null)
      router.push("/login")
      toast.success("Logged out successfully")
    },
    onError: () => {
      // Even if logout fails on server, we clear local state
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      delete axiosInstance.defaults.headers.common["Authorization"]
      queryClient.setQueryData(["user"], null)
      router.push("/login")
    },
  })

  const login = async (data: any) => {
    await loginMutation.mutateAsync(data)
  }

  const signup = async (data: any) => {
    await signupMutation.mutateAsync(data)
  }

  const logout = async () => {
    await logoutMutation.mutateAsync()
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
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
