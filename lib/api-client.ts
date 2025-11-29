import axios from "axios"
import { get } from "http"

// Create axios instance with base configuration
export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add request interceptor to attach auth token
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // More robust cookie parsing
      const match = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
      const token = match ? match[2] : null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        console.log("[v0] Attaching token to request:", config.url)
      } else {
        console.warn("[v0] No token found in cookies for request:", config.url)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401/403 errors globally
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== "undefined") {
        // Clear auth cookie
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login"
        }
      }
    }
    
    console.error("[v0] API Error:", error)
    throw error
  },
)

export const apiClient = {
  // Auth
  login: async (data: any) => {
    const response = await axiosInstance.post("/auth/login", data)
    // If the API returns a token in the body, we might need to set it manually if it's not set as a cookie
    // For now, we assume the API sets the cookie or we handle it in the context
    return response.data
  },

  signup: async (data: any) => {
    const response = await axiosInstance.post("/auth/register", data)
    return response.data
  },

  logout: async () => {
    const response = await axiosInstance.post("/auth/logout")
    return response.data
  },

  getCurrentUser: async () => {
    const response = await axiosInstance.get("/auth/profile")
    return response.data
  },

  // Businesses (formerly customers)
  getBusinesses: async (params?: { search?: string; status?: string }) => {
    const response = await axiosInstance.get("/businesses/all", { params })
    return response.data
  },

  getBusiness: async (id: string) => {
    const response = await axiosInstance.get(`/businesses/${id}`)
    return response.data
  },

  getBusinessContracts: async (businessId: string) => {
    const response = await axiosInstance.get(`/businesses/${businessId}/contracts`)
    return response.data
  },

  getBusinessSites: async (businessId: string) => {
    const response = await axiosInstance.get(`/businesses/${businessId}/sites`)
    return response.data
  },

  createBusiness: async (data: any) => {
    const response = await axiosInstance.post("/businesses", data)
    return response.data
  },

  updateBusiness: async ({ id, data }: { id: string; data: any }) => {
    const response = await axiosInstance.put(`/businesses/${id}`, data)
    return response.data
  },

  deactivateBusiness: async (id: string) => {
    const response = await axiosInstance.post(`/businesses/${id}/deactivate`)
    return response.data
  },

  // Users
  getUsers: async (params?: { search?: string; status?: string }) => {
    const response = await axiosInstance.get("/users", { params })
    return response.data
  },

  getUser: async (id: string) => {
    const response = await axiosInstance.get(`/users/${id}`)
    return response.data
  },

  createUser: async (data: any) => {
    const response = await axiosInstance.post("/users", data)
    return response.data
  },

  updateUser: async ({ id, data }: { id: string; data: any }) => {
    const response = await axiosInstance.put(`/users/${id}`, data)
    return response.data
  },

  // Quotes
  getQuotes: async (params?: { search?: string; status?: string }) => {
    const response = await axiosInstance.get("/quotes", { params })
    return response.data
  },

  getQuote: async (id: string) => {
    const response = await axiosInstance.get(`/quotes/${id}`)
    return response.data
  },

  updateQuote: async ({ id, data }: { id: string; data: any }) => {
    const response = await axiosInstance.put(`/quotes/${id}`, data)
    return response.data
  },

  // Contracts
  getContracts: async (params?: { search?: string; status?: string }) => {
    const response = await axiosInstance.get("/contracts", { params })
    return response.data
  },

  getContract: async (id: string) => {
    const response = await axiosInstance.get(`/contracts/${id}`)
    return response.data
  },

  updateContract: async ({ id, data }: { id: string; data: any }) => {
    const response = await axiosInstance.put(`/contracts/${id}`, data)
    return response.data
  },

  renewContract: async (id: string) => {
    const response = await axiosInstance.post(`/contracts/${id}/renew`)
    return response.data
  },

  viewContractDocuments: async (id: string) => {
    const response = await axiosInstance.get(`/contracts/${id}/documents`)
    return response.data
  },

  getContractUsageHistory: async (id: string) => {
    const response = await axiosInstance.get(`/contracts/${id}/usage-history`)
    return response.data
  },

  getContractBillingDetails: async (id: string) => {
    const response = await axiosInstance.get(`/contracts/${id}/billing`)
    return response.data
  },

  // Support Tickets
  getTickets: async (params?: { search?: string; status?: string; priority?: string }) => {
    const response = await axiosInstance.get("/tickets", { params })
    return response.data
  },

  getTicket: async (id: string) => {
    const response = await axiosInstance.get(`/tickets/${id}`)
    return response.data
  },

  updateTicket: async ({ id, data }: { id: string; data: any }) => {
    const response = await axiosInstance.put(`/tickets/${id}`, data)
    return response.data
  },

  addTicketMessage: async ({ id, message }: { id: string; message: string }) => {
    const response = await axiosInstance.post(`/tickets/${id}/messages`, { message })
    return response.data
  },

  // Emails
  getEmails: async (params?: { type?: string }) => {
    const response = await axiosInstance.get("/email", { params })
    return response.data
  },

  getEmail: async (id: string) => {
    const response = await axiosInstance.get(`/emails/${id}`)
    return response.data
  },

  sendEmail: async (data: any) => {
    const response = await axiosInstance.post("/email", data)
    return response.data
  },

  getScheduledEmails: async () => {
    const response = await axiosInstance.get("/emails/scheduled")
    return response.data
  },

  scheduleEmail: async (data: any) => {
    const response = await axiosInstance.post("/emails/scheduled", data)
    return response.data
  },

  updateScheduledEmail: async ({ id, data }: { id: string; data: any }) => {
    const response = await axiosInstance.put(`/emails/scheduled/${id}`, data)
    return response.data
  },

  cancelScheduledEmail: async (id: string) => {
    const response = await axiosInstance.post(`/emails/scheduled/${id}/cancel`)
    return response.data
  },

  // Email Templates
  getTemplates: async () => {
    const response = await axiosInstance.get("/email/templates")
    return response.data
  },

  createTemplate: async (data: any) => {
    const response = await axiosInstance.post("/email/templates", data)
    return response.data
  },

  // Notifications
  getNotifications: async (params?: { type?: string; unread?: boolean }) => {
    const response = await axiosInstance.get("/notifications", { params })
    return response.data
  },

  markNotificationRead: async (id: number) => {
    const response = await axiosInstance.post(`/notifications/${id}/read`)
    return response.data
  },

  markAllNotificationsRead: async () => {
    const response = await axiosInstance.post("/notifications/read-all")
    return response.data
  },

  deleteNotification: async (id: number) => {
    const response = await axiosInstance.delete(`/notifications/${id}`)
    return response.data
  },

  // Admins
  getAdmins: async () => {
    const response = await axiosInstance.get("/admins")
    return response.data
  },

  getPendingAdmins: async () => {
    const response = await axiosInstance.get("/admins/pending")
    return response.data
  },

  approveAdmin: async (id: number) => {
    const response = await axiosInstance.post(`/admins/${id}/approve`)
    return response.data
  },

  rejectAdmin: async (id: number) => {
    const response = await axiosInstance.post(`/admins/${id}/reject`)
    return response.data
  },

  createAdmin: async (data: any) => {
    const response = await axiosInstance.post("/admins", data)
    return response.data
  },

  // Profile
  getProfile: async () => {
    const response = await axiosInstance.get("/profile")
    return response.data
  },

  updateProfile: async (data: any) => {
    const response = await axiosInstance.put("/profile", data)
    return response.data
  },

  updatePassword: async (data: any) => {
    const response = await axiosInstance.put("/profile/password", data)
    return response.data
  },

  // Sites
  getSites: async (businessId?: string) => {
    const response = await axiosInstance.get("/sites", { params: { businessId } })
    return response.data
  },

  getSite: async (id: string) => {
    const response = await axiosInstance.get(`/sites/${id}`)
    return response.data
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    const response = await axiosInstance.get("/dashboard")
    return response.data
  },

  // Search
  globalSearch: async (query: string) => {
    const response = await axiosInstance.get("/search", { params: { q: query } })
    return response.data
  },
}
