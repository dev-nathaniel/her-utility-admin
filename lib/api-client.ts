import axios from "axios"

// ── API Response Types ──

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T | null
}

export interface UserData {
  _id: string
  firstName: string
  lastName: string
  fullname: string
  email: string
  role: string
  profilePicture: string | null
  phoneNumber?: string
  status?: string
  businesses: string[]
  sites: string[]
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: UserData
  token: string
  refreshToken: string
}

export interface BusinessData {
  _id: string
  name: string
  address?: string
  postcode?: string
  members: Array<{ userId: string; role: string }>
  utilities: string[]
  sites: string[]
  invites: string[]
  createdAt: string
  updatedAt: string
}

export interface EmailData {
  _id: string
  subject: string
  message: string
  recipientGroup?: string
  recipients?: string[]
  status: "draft" | "scheduled" | "sent"
  scheduledAt?: string
  template?: string
  templateVariables?: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface TicketData {
  _id: string
  subject: string
  description: string
  status: string
  priority: string
  customer: string
  assignedTo?: string
  messages?: Array<{ sender: string; message: string; createdAt: string }>
  createdAt: string
  updatedAt: string
}

export interface SiteData {
  _id: string
  name: string
  address?: string
  businessId: string
  contracts: string[]
  createdAt: string
  updatedAt: string
}

export interface ContractData {
  _id: string
  name: string
  status: string
  businessId: string
  siteId?: string
  startDate: string
  endDate?: string
  value?: number
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  overview?: Record<string, any>
  totalBusinesses?: number
  totalContracts?: number
  totalRevenue?: number
  activeUsers?: number
  siteCount?: number
  userCount?: number
  emailsSentCount?: number
  emailScheduledCount?: number
  templatesCount?: number
  [key: string]: unknown
}

export interface NotificationData {
  _id: string
  type: string
  message: string
  read: boolean
  createdAt: string
}

export interface AdminData {
  _id: string
  email: string
  fullname: string
  role: string
  status: string
  createdAt: string
}

export interface CreateBusinessPayload {
  name: string
  address?: string
  postcode?: string
  members: Array<{ userId: string; role: "owner" | "manager" | "viewer" }>
}

export interface SendEmailPayload {
  subject: string
  message: string
  recipientGroup?: string
  recipients?: string[]
  scheduledAt?: string | null
  templateId?: string | null
  templateVariables?: Record<string, string>
  saveAsDraft?: boolean
}

export interface UpdateProfilePayload {
  fullname?: string
  email?: string
  phoneNumber?: string
  bio?: string
}

export interface UpdatePasswordPayload {
  currentPassword: string
  newPassword: string
}

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
      // Check if Authorization header is already set (e.g. from defaults)
      if (config.headers.Authorization) {
         return config;
      }

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
  login: async (data: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> => {
    const response = await axiosInstance.post("/auth/login", data)
    return response.data
  },

  signup: async (data: { email: string; password: string; firstName?: string; lastName?: string; name?: string }): Promise<ApiResponse<AuthResponse>> => {
    const response = await axiosInstance.post("/auth/register", data)
    return response.data
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post("/auth/logout")
    return response.data
  },

  getCurrentUser: async (): Promise<ApiResponse<{ user: UserData }>> => {
    const response = await axiosInstance.get("/auth/profile")
    return response.data
  },

  // Businesses (formerly customers)
  getBusinesses: async (params?: { search?: string; status?: string }): Promise<ApiResponse<BusinessData[]>> => {
    const response = await axiosInstance.get("/businesses/all", { params })
    return response.data
  },

  getBusiness: async (id: string): Promise<ApiResponse<{ business: BusinessData }>> => {
    const response = await axiosInstance.get(`/businesses/${id}`)
    return response.data
  },

  getBusinessContracts: async (businessId: string): Promise<ApiResponse<ContractData[]>> => {
    const response = await axiosInstance.get(`/businesses/${businessId}/contracts`)
    return response.data
  },

  getBusinessSites: async (businessId: string): Promise<ApiResponse<SiteData[]>> => {
    const response = await axiosInstance.get(`/businesses/${businessId}/sites`)
    return response.data
  },

  createBusiness: async (data: CreateBusinessPayload): Promise<ApiResponse<{ business: BusinessData }>> => {
    const response = await axiosInstance.post("/businesses", data)
    return response.data
  },

  updateBusiness: async ({ id, data }: { id: string; data: Partial<CreateBusinessPayload> }): Promise<ApiResponse<{ business: BusinessData }>> => {
    const response = await axiosInstance.put(`/businesses/${id}`, data)
    return response.data
  },

  deactivateBusiness: async (id: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post(`/businesses/${id}/deactivate`)
    return response.data
  },

  // Users
  getUsers: async (params?: { search?: string; status?: string }): Promise<ApiResponse<UserData[]>> => {
    const response = await axiosInstance.get("/users", { params })
    return response.data
  },

  getUser: async (id: string): Promise<ApiResponse<UserData>> => {
    const response = await axiosInstance.get(`/users/${id}`)
    return response.data
  },

  createUser: async (data: Partial<UserData>): Promise<ApiResponse<UserData>> => {
    const response = await axiosInstance.post("/users", data)
    return response.data
  },

  updateUser: async ({ id, data }: { id: string; data: Partial<UserData> }): Promise<ApiResponse<UserData>> => {
    const response = await axiosInstance.put(`/users/${id}`, data)
    return response.data
  },

  // Quotes
  getQuotes: async (params?: { search?: string; status?: string }): Promise<ApiResponse<unknown[]>> => {
    const response = await axiosInstance.get("/quotes", { params })
    return response.data
  },

  createQuote: async (data: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
    const response = await axiosInstance.post("/quotes", data)
    return response.data
  },

  getQuote: async (id: string): Promise<ApiResponse<unknown>> => {
    const response = await axiosInstance.get(`/quotes/${id}`)
    return response.data
  },

  updateQuote: async ({ id, data }: { id: string; data: Record<string, unknown> }): Promise<ApiResponse<unknown>> => {
    const response = await axiosInstance.put(`/quotes/${id}`, data)
    return response.data
  },

  // Utilities (Contracts)
  getContracts: async (params?: { search?: string; status?: string }): Promise<ApiResponse<ContractData[]>> => {
    const response = await axiosInstance.get("/utilities", { params })
    return response.data
  },

  getContract: async (id: string): Promise<ApiResponse<ContractData>> => {
    const response = await axiosInstance.get(`/utilities/${id}`)
    return response.data
  },

  updateContract: async ({ id, data }: { id: string; data: Partial<ContractData> }): Promise<ApiResponse<ContractData>> => {
    const response = await axiosInstance.put(`/utilities/${id}`, data)
    return response.data
  },

  renewContract: async (id: string): Promise<ApiResponse<ContractData>> => {
    const response = await axiosInstance.post(`/utilities/${id}/renew`)
    return response.data
  },

  viewContractDocuments: async (id: string): Promise<ApiResponse<unknown>> => {
    const response = await axiosInstance.get(`/contracts/${id}/documents`)
    return response.data
  },

  getContractUsageHistory: async (id: string): Promise<ApiResponse<unknown>> => {
    const response = await axiosInstance.get(`/contracts/${id}/usage-history`)
    return response.data
  },

  getContractBillingDetails: async (id: string): Promise<ApiResponse<unknown>> => {
    const response = await axiosInstance.get(`/contracts/${id}/billing`)
    return response.data
  },

  // Support Tickets
  getTickets: async (params?: { search?: string; status?: string; priority?: string }): Promise<ApiResponse<TicketData[]>> => {
    const response = await axiosInstance.get("/tickets", { params })
    return response.data
  },

  getTicket: async (id: string): Promise<ApiResponse<TicketData>> => {
    const response = await axiosInstance.get(`/tickets/${id}`)
    return response.data
  },

  updateTicket: async ({ id, data }: { id: string; data: Partial<TicketData> }): Promise<ApiResponse<TicketData>> => {
    const response = await axiosInstance.put(`/tickets/${id}`, data)
    return response.data
  },

  addTicketMessage: async ({ id, message }: { id: string; message: string }): Promise<ApiResponse<TicketData>> => {
    const response = await axiosInstance.post(`/tickets/${id}/messages`, { message })
    return response.data
  },

  // Emails
  getEmails: async (params?: { type?: string }): Promise<ApiResponse<EmailData[]>> => {
    const response = await axiosInstance.get("/email", { params })
    return response.data
  },

  getEmail: async (id: string): Promise<ApiResponse<EmailData>> => {
    const response = await axiosInstance.get(`/emails/${id}`)
    return response.data
  },

  sendEmail: async (data: SendEmailPayload): Promise<{ message: string; email: EmailData }> => {
    const response = await axiosInstance.post("/email", data)
    return response.data
  },

  getScheduledEmails: async (): Promise<ApiResponse<EmailData[]>> => {
    const response = await axiosInstance.get("/emails/scheduled")
    return response.data
  },

  scheduleEmail: async (data: SendEmailPayload & { scheduledAt: string }): Promise<{ message: string; email: EmailData }> => {
    const response = await axiosInstance.post("/email", { ...data, scheduledAt: data.scheduledAt })
    return response.data
  },

  updateScheduledEmail: async ({ id, data }: { id: string; data: Partial<SendEmailPayload> }): Promise<{ message: string; email: EmailData }> => {
    const response = await axiosInstance.put(`/emails/scheduled/${id}`, data)
    return response.data
  },

  cancelScheduledEmail: async (id: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post(`/emails/scheduled/${id}/cancel`)
    return response.data
  },

  // Email Templates
  getTemplates: async (): Promise<ApiResponse<unknown[]>> => {
    const response = await axiosInstance.get("/email/templates")
    return response.data
  },

  createTemplate: async (data: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
    const response = await axiosInstance.post("/email/templates", data)
    return response.data
  },

  // Notifications
  getNotifications: async (params?: { type?: string; unread?: boolean }): Promise<ApiResponse<NotificationData[]>> => {
    const response = await axiosInstance.get("/notifications", { params })
    return response.data
  },

  markNotificationRead: async (id: number): Promise<ApiResponse<NotificationData>> => {
    const response = await axiosInstance.post(`/notifications/${id}/read`)
    return response.data
  },

  markAllNotificationsRead: async (): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post("/notifications/read-all")
    return response.data
  },

  deleteNotification: async (id: number): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.delete(`/notifications/${id}`)
    return response.data
  },

  // Admins
  getAdmins: async (): Promise<ApiResponse<AdminData[]>> => {
    const response = await axiosInstance.get("/admins")
    return response.data
  },

  getPendingAdmins: async (): Promise<ApiResponse<AdminData[]>> => {
    const response = await axiosInstance.get("/admins/pending")
    return response.data
  },

  approveAdmin: async (id: number | string): Promise<ApiResponse<AdminData>> => {
    const response = await axiosInstance.post(`/admins/${id}/approve`)
    return response.data
  },

  rejectAdmin: async (id: number | string): Promise<ApiResponse<AdminData>> => {
    const response = await axiosInstance.post(`/admins/${id}/reject`)
    return response.data
  },

  createAdmin: async (data: { email: string; password: string; fullname: string }): Promise<ApiResponse<AdminData>> => {
    const response = await axiosInstance.post("/admins", data)
    return response.data
  },

  // Profile
  getProfile: async (): Promise<ApiResponse<{ user: UserData }>> => {
    const response = await axiosInstance.get("/profile")
    return response.data
  },

  updateProfile: async (data: UpdateProfilePayload): Promise<ApiResponse<UserData>> => {
    const response = await axiosInstance.put("/profile", data)
    return response.data
  },

  updatePassword: async (data: UpdatePasswordPayload): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.put("/profile/password", data)
    return response.data
  },

  // Sites
  getSites: async (businessId?: string): Promise<ApiResponse<SiteData[]>> => {
    const response = await axiosInstance.get("/sites", { params: { businessId } })
    return response.data
  },

  getSite: async (id: string): Promise<ApiResponse<SiteData>> => {
    const response = await axiosInstance.get(`/sites/${id}`)
    return response.data
  },

  getSiteWithContracts: async (id: string): Promise<ApiResponse<SiteData>> => {
    const response = await axiosInstance.get(`/sites/${id}`)
    return response.data
  },

  getSiteContracts: async (id: string): Promise<ApiResponse<ContractData[]>> => {
    const response = await axiosInstance.get(`/sites/${id}/contracts`)
    return response.data
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await axiosInstance.get("/dashboard")
    return response.data
  },

  // Search
  globalSearch: async (query: string): Promise<ApiResponse<unknown[]>> => {
    const response = await axiosInstance.get("/search", { params: { q: query } })
    return response.data
  },
}
