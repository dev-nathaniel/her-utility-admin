import axios from "axios"

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("[v0] API Error:", error)
    throw error
  },
)

export const apiClient = {
  // Businesses (formerly customers)
  getBusinesses: async (params?: { search?: string; status?: string }) => {
    return axiosInstance.get("/businesses", { params })
  },

  getBusiness: async (id: string) => {
    return axiosInstance.get(`/businesses/${id}`)
  },

  createBusiness: async (data: any) => {
    return axiosInstance.post("/businesses", data)
  },

  updateBusiness: async ({ id, data }: { id: string; data: any }) => {
    return axiosInstance.put(`/businesses/${id}`, data)
  },

  deactivateBusiness: async (id: string) => {
    return axiosInstance.post(`/businesses/${id}/deactivate`)
  },

  // Users
  getUsers: async (params?: { search?: string; status?: string }) => {
    return axiosInstance.get("/users", { params })
  },

  getUser: async (id: string) => {
    return axiosInstance.get(`/users/${id}`)
  },

  createUser: async (data: any) => {
    return axiosInstance.post("/users", data)
  },

  updateUser: async ({ id, data }: { id: string; data: any }) => {
    return axiosInstance.put(`/users/${id}`, data)
  },

  // Quotes
  getQuotes: async (params?: { search?: string; status?: string }) => {
    return axiosInstance.get("/quotes", { params })
  },

  getQuote: async (id: string) => {
    return axiosInstance.get(`/quotes/${id}`)
  },

  updateQuote: async ({ id, data }: { id: string; data: any }) => {
    return axiosInstance.put(`/quotes/${id}`, data)
  },

  // Contracts
  getContracts: async (params?: { search?: string; status?: string }) => {
    return axiosInstance.get("/contracts", { params })
  },

  getContract: async (id: string) => {
    return axiosInstance.get(`/contracts/${id}`)
  },

  updateContract: async ({ id, data }: { id: string; data: any }) => {
    return axiosInstance.put(`/contracts/${id}`, data)
  },

  renewContract: async (id: string) => {
    return axiosInstance.post(`/contracts/${id}/renew`)
  },

  viewContractDocuments: async (id: string) => {
    return axiosInstance.get(`/contracts/${id}/documents`)
  },

  getContractUsageHistory: async (id: string) => {
    return axiosInstance.get(`/contracts/${id}/usage-history`)
  },

  getContractBillingDetails: async (id: string) => {
    return axiosInstance.get(`/contracts/${id}/billing`)
  },

  // Support Tickets
  getTickets: async (params?: { search?: string; status?: string; priority?: string }) => {
    return axiosInstance.get("/tickets", { params })
  },

  getTicket: async (id: string) => {
    return axiosInstance.get(`/tickets/${id}`)
  },

  updateTicket: async ({ id, data }: { id: string; data: any }) => {
    return axiosInstance.put(`/tickets/${id}`, data)
  },

  addTicketMessage: async ({ id, message }: { id: string; message: string }) => {
    return axiosInstance.post(`/tickets/${id}/messages`, { message })
  },

  // Emails
  getEmails: async (params?: { type?: string }) => {
    return axiosInstance.get("/emails", { params })
  },

  getEmail: async (id: string) => {
    return axiosInstance.get(`/emails/${id}`)
  },

  sendEmail: async (data: any) => {
    return axiosInstance.post("/emails/send", data)
  },

  updateScheduledEmail: async ({ id, data }: { id: string; data: any }) => {
    return axiosInstance.put(`/emails/scheduled/${id}`, data)
  },

  cancelScheduledEmail: async (id: string) => {
    return axiosInstance.post(`/emails/scheduled/${id}/cancel`)
  },

  // Email Templates
  getTemplates: async () => {
    return axiosInstance.get("/email-templates")
  },

  createTemplate: async (data: any) => {
    return axiosInstance.post("/email-templates", data)
  },

  // Notifications
  getNotifications: async (params?: { type?: string; unread?: boolean }) => {
    return axiosInstance.get("/notifications", { params })
  },

  markNotificationRead: async (id: number) => {
    return axiosInstance.post(`/notifications/${id}/read`)
  },

  markAllNotificationsRead: async () => {
    return axiosInstance.post("/notifications/read-all")
  },

  deleteNotification: async (id: number) => {
    return axiosInstance.delete(`/notifications/${id}`)
  },

  // Admins
  getAdmins: async () => {
    return axiosInstance.get("/admins")
  },

  getPendingAdmins: async () => {
    return axiosInstance.get("/admins/pending")
  },

  approveAdmin: async (id: number) => {
    return axiosInstance.post(`/admins/${id}/approve`)
  },

  rejectAdmin: async (id: number) => {
    return axiosInstance.post(`/admins/${id}/reject`)
  },

  createAdmin: async (data: any) => {
    return axiosInstance.post("/admins", data)
  },

  // Profile
  getProfile: async () => {
    return axiosInstance.get("/profile")
  },

  updateProfile: async (data: any) => {
    return axiosInstance.put("/profile", data)
  },

  updatePassword: async (data: any) => {
    return axiosInstance.put("/profile/password", data)
  },

  // Sites
  getSites: async (businessId?: string) => {
    return axiosInstance.get("/sites", { params: { businessId } })
  },

  getSite: async (id: string) => {
    return axiosInstance.get(`/sites/${id}`)
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    return axiosInstance.get("/dashboard/stats")
  },

  // Search
  globalSearch: async (query: string) => {
    return axiosInstance.get("/search", { params: { q: query } })
  },
}
