"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  Newspaper,
  HeadphonesIcon,
  Zap,
  Menu,
  X,
  Bell,
  Search,
  Rocket,
  UserCog,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useWebSocket } from "@/lib/websocket-provider"
import { ErrorBoundary } from "@/components/error-boundary"

type navigationType = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const navigation: navigationType[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Businesses", href: "/dashboard/businesses", icon: Building2 },
  { name: "Quote Enquiries", href: "/dashboard/quotes", icon: FileText },
  { name: "Email Management", href: "/dashboard/emails", icon: Mail },
  { name: "Content Management", href: "/dashboard/content", icon: Newspaper },
  { name: "Support", href: "/dashboard/support", icon: HeadphonesIcon},
  { name: "Utility Contracts", href: "/dashboard/contracts", icon: Zap },
  { name: "Admins", href: "/dashboard/admins", icon: UserCog },
  { name: "Activity Log", href: "/dashboard/activity-log", icon: Rocket },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { logout, user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ users: any[]; businesses: any[] }>({ users: [], businesses: [] })
  const [searchOpen, setSearchOpen] = useState(false)
  const { isConnected } = useWebSocket()
  const queryClient = useQueryClient()
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: allUsersData } = useQuery({
    queryKey: ["global-search-users"],
    queryFn: () => apiClient.getUsers(),
    staleTime: 60000,
  })

  const { data: allBizData } = useQuery({
    queryKey: ["global-search-businesses"],
    queryFn: () => apiClient.getBusinesses(),
    staleTime: 60000,
  })

  const { data: notificationData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.getNotifications(),
    refetchInterval: 30000,
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 60000,
  })

  const overview = stats?.overview || {}

  const navigationItems = navigation.map(item => {
    if (item.name === "Utility Contracts") {
        return { ...item, badge: overview.pendingUtilitiesCount || 0 }
    }
    if (item.name === "Quote Enquiries") {
        return { ...item, badge: overview.pendingQuotesCount || 0 }
    }
    if (item.name === "Admins") {
        return { ...item, badge: overview.pendingAdminsCount || 0 }
    }
    return item
  })

  const handleLogout = async () => {
    await logout()
  }

  const notifications: any[] = Array.isArray(notificationData?.data) ? notificationData.data : []
  const unreadCount = notifications.filter((n: any) => n.unread).length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const trimmed = localSearchQuery.trim().toLowerCase()
    if (!trimmed) {
      setSearchResults({ users: [], businesses: [] })
      setSearchOpen(false)
      return
    }

    const allUsers = Array.isArray(allUsersData?.data) ? allUsersData.data : (allUsersData?.data?.users || [])
    const allBiz = Array.isArray(allBizData?.data) ? allBizData.data : (allBizData?.data?.businesses || [])

    const filteredUsers = allUsers.filter(
      (u: any) =>
        (u.fullname || "").toLowerCase().includes(trimmed) ||
        (u.email || "").toLowerCase().includes(trimmed),
    )
    const filteredBiz = allBiz.filter(
      (b: any) =>
        (b.name || "").toLowerCase().includes(trimmed) ||
        (b.address || "").toLowerCase().includes(trimmed),
    )

    setSearchResults({ users: filteredUsers, businesses: filteredBiz })
    setSearchOpen(true)
  }, [localSearchQuery, allUsersData, allBizData])

  const totalResults = searchResults.users.length + searchResults.businesses.length

  const handleSelectResult = useCallback(
    (type: "user" | "business", id: string) => {
      setSearchOpen(false)
      setLocalSearchQuery("")
      setSearchResults({ users: [], businesses: [] })
      const base = type === "user" ? "/dashboard/users" : "/dashboard/businesses"
      router.push(`${base}?open=${id}`)
    },
    [router],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">CRM</span>
            </div>
            <span className="text-lg font-semibold">Admin Dashboard</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </div>
                {!!item.badge && (
                  <Badge
                    className={cn(
                      "h-5 min-w-5 rounded-full px-1.5 text-xs",
                      isActive ? "bg-accent-foreground text-accent" : "bg-accent text-accent-foreground",
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>{user?.fullname?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullname || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div ref={searchRef} className="relative w-96 max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users, businesses..."
                className="pl-9"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                onFocus={() => { if (localSearchQuery.trim() && totalResults > 0) setSearchOpen(true) }}
                onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false) }}
              />
              {searchOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border bg-popover p-1 shadow-md">
                  {totalResults === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No results found</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.users.length > 0 && (
                        <div>
                          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Users</p>
                          {searchResults.users.map((u: any) => (
                            <button
                              key={u._id}
                              className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-accent"
                              onClick={() => handleSelectResult("user", u._id)}
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">{(u.fullname || u.email || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 text-left">
                                <p className="font-medium">{u.fullname || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.businesses.length > 0 && (
                        <div>
                          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Businesses</p>
                          {searchResults.businesses.map((b: any) => (
                            <button
                              key={b._id}
                              className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-accent"
                              onClick={() => handleSelectResult("business", b._id)}
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                <Building2 className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium">{b.name}</p>
                                <p className="text-xs text-muted-foreground">{b.address || ""}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs bg-accent text-accent-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h3 className="font-semibold">Notifications</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                  >
                    Mark all as read
                  </Button>
                </div>
                <ScrollArea className="h-96">
                  <div className="divide-y">
                    {notifications.map((notification: any) => {
                      const nid = notification._id || notification.id
                      const title = notification.title || notification.type || "Notification"
                      const message = notification.message || notification.details || ""
                      const isUnread = notification.unread || !notification.read
                      const time = notification.time || notification.createdAt
                      return (
                        <div
                          key={nid}
                          className={cn(
                            "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                            isUnread && "bg-muted/30",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{title}</p>
                                {isUnread && <span className="h-2 w-2 rounded-full bg-accent" />}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{message}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{time}</p>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
                <div className="border-t p-2">
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link href="/dashboard/notifications" onClick={() => setNotificationsOpen(false)}>
                      View all notifications
                    </Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>{user?.fullname?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user?.fullname || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
