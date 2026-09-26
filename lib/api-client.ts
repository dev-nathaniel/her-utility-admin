import axios from "axios"

// ── API Types aligned with Price Buddy Backend ──

export interface UserData {
  id: string
  _id?: string
  email: string
  full_name?: string
  fullname?: string
  company_name?: string
  role?: string
  is_admin: boolean
  property_count?: number
  contract_count?: number
  business_count?: number
  is_multi_business?: boolean
  open_change_requests?: number
  pending_scans?: number
  created_at?: string
  createdAt?: string
  phone?: string
  phoneNumber?: string
}

export interface AuthResponse {
  message: string
  token: string
  user: UserData
}

export interface CompanyData {
  id: string
  _id?: string
  email: string
  full_name?: string
  company_name: string
  name?: string
  pipeline_status: "new_lead" | "contacted" | "quote_sent" | "customer" | "lost" | string
  property_count: number
  contract_count: number
  business_count: number
  is_multi_business: boolean
  open_change_requests: number
  pending_scans: number
  urgency_level?: string
  last_activity_at?: string
  created_at: string
  createdAt?: string
  assigned_broker_id?: string | null
  assigned_broker_name?: string | null
}

export interface ContractData {
  id: string
  _id?: string
  user_id: string
  property_id?: string
  utility_type: "electricity" | "gas" | "water" | "telecoms" | string
  supplier_name: string
  account_number?: string
  meter_number?: string
  start_date?: string | null
  end_date?: string | null
  contract_end_date?: string | null
  standing_charge?: number | string
  unit_rate?: number | string
  annual_spend?: number | string
  status?: string
  urgency_level?: string
  days_until_expiry?: number | null
  renewable_now?: boolean
  user_email?: string
  user_full_name?: string
  user_company?: string
  property_address?: string
  property_postcode?: string
  property_name?: string
  created_at?: string
}

export interface ScanData {
  id: string
  _id?: string
  user_id: string
  filename: string
  content_type?: string
  size_bytes?: number
  status: "pending_review" | "applied" | "rejected" | string
  source?: string
  created_at: string
  customer_email?: string
  customer_name?: string
  customer_company?: string
  user_email?: string
  user_full_name?: string
  call_requested_at?: string | null
  extracted_data?: {
    supplier?: string
    utility_type?: string
    account_number?: string
    meter_number?: string
    mpan_mprn?: string
    contract_end_date?: string
    standing_charge?: number | string
    unit_rate?: number | string
    total_amount?: number | string
    [key: string]: any
  }
  notes?: Array<{
    id: string
    body: string
    created_at: string
    author_name?: string
  }>
  sanity_check?: {
    is_valid?: boolean
    flags?: string[]
    [key: string]: any
  }
}

export interface QuoteData {
  id: string
  _id?: string
  user_id?: string
  company_name?: string
  property_address?: string
  contract_id?: string
  utility_type: string
  current_spend?: number | string
  status: "pending" | "quoted" | "accepted" | "rejected" | string
  notes?: string
  requirements?: string
  created_at: string
  createdAt?: string
  user_email?: string
  user_full_name?: string
}

export interface ConciergeThread {
  user_id: string
  email?: string
  full_name?: string
  company_name?: string
  last_body?: string
  last_sender?: "customer" | "broker" | string
  last_at?: string
  message_count?: number
  customer_unread?: number
  awaiting_reply?: boolean
}

export interface ConciergeMessage {
  id: string
  user_id: string
  sender: "customer" | "broker"
  body: string
  created_at: string
  read_by_customer?: boolean
  broker_name?: string
}

export interface DashboardStats {
  users: number
  properties: number
  contracts: number
  scans_all_time: number
  quotes_all_time: number
  scans_last_30: number
  quotes_last_30: number
  alerts_sent_last_30: number
  pending_quotes: number
  urgency: {
    critical: number
    high: number
    medium: number
    renewable: number
    low: number
    normal: number
    expired: number
  }
}

export interface QueueStats {
  pending: number
  call_requested: number
}

export interface RecentCustomer {
  id: string
  company_name: string
  full_name: string
  email: string
  pipeline_status: string
  last_activity_at: string
  last_activity_summary?: string | null
  last_activity_type?: string | null
  urgency_level: string
  min_days_to_expiry?: number | null
  url: string
}

export interface AlertData {
  id?: string
  user_id: string
  user_email?: string
  user_full_name?: string
  contract_id?: string
  urgency_level?: string
  days_to_expiry?: number
  utility_type?: string
  sent_at: string
  status?: string
}

// ── Axios Instance ──

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Attach JWT token from cookie or localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      let token: string | null = null

      // Check cookie
      const match = document.cookie.match(new RegExp("(^| )auth-token=([^;]+)"))
      if (match && match[2]) {
        token = match[2]
      }

      // Check localStorage fallback
      if (!token) {
        token = localStorage.getItem("auth-token")
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Global response error handler
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== "undefined") {
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        localStorage.removeItem("auth-token")
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login"
        }
      }
    }
    return Promise.reject(error)
  },
)

// ── API Client Methods ──

export const apiClient = {
  // Auth
  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/login", data)
    return response.data
  },

  signup: async (data: {
    email: string
    password: string
    full_name?: string
    name?: string
    company_name?: string
  }): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/register", {
      email: data.email,
      password: data.password,
      full_name: data.full_name || data.name || "",
      company_name: data.company_name || "My Business",
    })
    return response.data
  },

  logout: async (): Promise<void> => {
    if (typeof window !== "undefined") {
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      localStorage.removeItem("auth-token")
    }
  },

  getCurrentUser: async (): Promise<UserData> => {
    const response = await axiosInstance.get("/me")
    const u = response.data
    return {
      ...u,
      _id: u.id,
      fullname: u.full_name || u.email,
    }
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await axiosInstance.get("/admin/stats")
    return response.data
  },

  getQueueStats: async (): Promise<QueueStats> => {
    const response = await axiosInstance.get("/admin/queue-stats")
    return response.data
  },

  getRecentCustomers: async (limit = 6): Promise<RecentCustomer[]> => {
    const response = await axiosInstance.get(`/admin/recent-customers?limit=${limit}`)
    return response.data
  },

  // Companies / Businesses
  getCompanies: async (): Promise<CompanyData[]> => {
    const response = await axiosInstance.get("/admin/companies")
    return (response.data || []).map((c: any) => ({
      ...c,
      _id: c.id,
      name: c.company_name || c.full_name || c.email,
      numberOfSites: c.property_count || 0,
      numberOfContracts: c.contract_count || 0,
      status: c.pipeline_status || "new_lead",
    }))
  },

  getBusinesses: async (): Promise<CompanyData[]> => {
    return apiClient.getCompanies()
  },

  getCompany: async (id: string): Promise<any> => {
    const response = await axiosInstance.get(`/admin/companies/${id}`)
    return response.data
  },

  getBusiness: async (id: string): Promise<any> => {
    return apiClient.getCompany(id)
  },

  updateCompanyStatus: async (id: string, status: string): Promise<any> => {
    const response = await axiosInstance.put(`/admin/companies/${id}/status`, { status })
    return response.data
  },

  addCompanyNote: async (id: string, note: string): Promise<any> => {
    const response = await axiosInstance.post(`/admin/companies/${id}/notes`, { body: note })
    return response.data
  },

  assignCompanyBroker: async (companyId: string, brokerId: string): Promise<any> => {
    const response = await axiosInstance.put(`/admin/companies/${companyId}/broker`, { broker_id: brokerId })
    return response.data
  },

  // Users
  getUsers: async (params?: { search?: string; status?: string }): Promise<UserData[]> => {
    const response = await axiosInstance.get("/admin/users")
    const users = (response.data || []).map((u: any) => ({
      ...u,
      _id: u.id,
      fullname: u.full_name || u.email,
      status: u.is_admin ? "Broker / Admin" : "Customer",
      numberOfBusinesses: u.business_count || 0,
      numberOfSites: u.property_count || 0,
      numberOfContracts: u.contract_count || 0,
    }))
    return users
  },

  toggleUserAdmin: async (userId: string, isAdmin: boolean): Promise<any> => {
    const response = await axiosInstance.put(`/admin/users/${userId}/admin`, { is_admin: isAdmin })
    return response.data
  },

  getBrokers: async (): Promise<any[]> => {
    const response = await axiosInstance.get("/admin/brokers")
    return response.data
  },

  // Contracts (Utilities)
  getContracts: async (params?: { search?: string; status?: string; utility_type?: string }): Promise<ContractData[]> => {
    const response = await axiosInstance.get("/admin/contracts")
    return (response.data || []).map((c: any) => ({
      ...c,
      _id: c.id,
      contractNumber: c.meter_number || c.account_number || c.id?.substring(0, 8),
      customer: c.user_company || c.user_full_name || c.user_email || "Customer",
      site: c.property_name || c.property_address || "Default Site",
      type: c.utility_type ? c.utility_type.charAt(0).toUpperCase() + c.utility_type.slice(1) : "Electricity",
      provider: c.supplier_name || "Unknown Supplier",
      startDate: c.start_date || "",
      endDate: c.end_date || c.contract_end_date || "",
      status: c.days_until_expiry != null && c.days_until_expiry < 0 ? "Expired" : "Active",
    }))
  },

  updateContract: async (id: string, data: Partial<ContractData>): Promise<any> => {
    const response = await axiosInstance.put(`/admin/contracts/${id}`, data)
    return response.data
  },

  getContractRevisions: async (id: string): Promise<any[]> => {
    const response = await axiosInstance.get(`/admin/contracts/${id}/revisions`)
    return response.data
  },

  revertContract: async (id: string, revisionId: string): Promise<any> => {
    const response = await axiosInstance.post(`/admin/contracts/${id}/revert/${revisionId}`)
    return response.data
  },

  // Bill Scans (OCR Review Queue)
  getScans: async (): Promise<ScanData[]> => {
    const response = await axiosInstance.get("/admin/scans")
    return (response.data || []).map((s: any) => ({ ...s, _id: s.id }))
  },

  getPendingScans: async (): Promise<ScanData[]> => {
    const response = await axiosInstance.get("/admin/scans/pending")
    return (response.data || []).map((s: any) => ({ ...s, _id: s.id }))
  },

  applyScanToContract: async (scanId: string, payload?: any): Promise<any> => {
    const response = await axiosInstance.post(`/admin/scans/${scanId}/apply-to-contract`, payload || {})
    return response.data
  },

  rejectScan: async (scanId: string, reason?: string): Promise<any> => {
    const response = await axiosInstance.post(`/admin/scans/${scanId}/reject`, { reason: reason || "Rejected by broker" })
    return response.data
  },

  rerunScanSanityCheck: async (scanId: string): Promise<any> => {
    const response = await axiosInstance.post(`/admin/scans/${scanId}/sanity-check`)
    return response.data
  },

  getScanNotes: async (scanId: string): Promise<any[]> => {
    const response = await axiosInstance.get(`/admin/scans/${scanId}/notes`)
    return response.data
  },

  addScanNote: async (scanId: string, note: string): Promise<any> => {
    const response = await axiosInstance.post(`/admin/scans/${scanId}/notes`, { body: note })
    return response.data
  },

  // Quote Enquiries
  getQuotes: async (params?: { search?: string; status?: string }): Promise<QuoteData[]> => {
    const response = await axiosInstance.get("/admin/quotes")
    return (response.data || []).map((q: any) => ({
      ...q,
      _id: q.id,
      customer: q.company_name || q.user_email || "Customer",
      submittedDate: q.created_at || new Date().toISOString(),
    }))
  },

  updateQuoteStatus: async (quoteId: string, status: string, notes?: string): Promise<any> => {
    const response = await axiosInstance.put(`/admin/quotes/${quoteId}/status`, { status, notes })
    return response.data
  },

  // Concierge Support Chat
  getConciergeThreads: async (): Promise<ConciergeThread[]> => {
    const response = await axiosInstance.get("/admin/concierge/threads")
    return response.data || []
  },

  getConciergeThread: async (userId: string): Promise<ConciergeMessage[]> => {
    const response = await axiosInstance.get(`/admin/concierge/threads/${userId}`)
    return response.data || []
  },

  replyConciergeThread: async (userId: string, body: string): Promise<any> => {
    const response = await axiosInstance.post(`/admin/concierge/threads/${userId}/reply`, { body })
    return response.data
  },

  // Sent Alerts History
  getAlerts: async (): Promise<AlertData[]> => {
    const response = await axiosInstance.get("/admin/alerts")
    return response.data || []
  },

  getNotifications: async (): Promise<any> => {
    const alerts = await apiClient.getAlerts()
    return {
      data: alerts.map((a: any, i: number) => ({
        _id: a.id || String(i),
        title: `Renewal Alert: ${a.utility_type || "Utility"} (${a.urgency_level || "urgent"})`,
        message: `Alert sent to ${a.user_email || "customer"} - ${a.days_to_expiry ?? "N/A"} days to expiry`,
        time: a.sent_at ? new Date(a.sent_at).toLocaleString() : "",
        unread: false,
      })),
    }
  },

  markAllNotificationsRead: async (): Promise<any> => {
    return { success: true }
  },

  // Sweeps & Maintenance
  runRenewalsSweep: async (): Promise<any> => {
    const response = await axiosInstance.post("/admin/renewals/run")
    return response.data
  },

  runBrokerDigest: async (): Promise<any> => {
    const response = await axiosInstance.post("/admin/digest/run")
    return response.data
  },

  // Global Search
  globalSearch: async (query: string): Promise<any> => {
    const response = await axiosInstance.get(`/admin/search?q=${encodeURIComponent(query)}`)
    return response.data
  },
}
