"use client"

import type React from "react"

import { useState } from "react"
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
import { usePathname } from "next/navigation"
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
import { useSearch } from "@/lib/search-provider"
import { useAuth } from "@/lib/auth-context"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Businesses", href: "/dashboard/businesses", icon: Building2 },
  { name: "Quote Enquiries", href: "/dashboard/quotes", icon: FileText, badge: 5 },
  { name: "Email Management", href: "/dashboard/emails", icon: Mail },
  { name: "Content Management", href: "/dashboard/content", icon: Newspaper },
  { name: "Support", href: "/dashboard/support", icon: HeadphonesIcon, badge: 3 },
  { name: "Utility Contracts", href: "/dashboard/contracts", icon: Zap, badge: 8 }, // Critical count will be dynamic
  { name: "Admins", href: "/dashboard/admins", icon: UserCog, badge: 2 },
  // { name: "Coming Soon", href: "/dashboard/coming-soon", icon: Rocket },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const pathname = usePathname()
  const { searchQuery, setSearchQuery, performSearch } = useSearch()
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const { logout, user } = useAuth()



  const handleLogout = async () => {
    await logout()
  }

  const notifications = [
    {
      id: 1,
      title: "New Quote Request",
      message: "ABC Corp requested a quote for 3 sites",
      time: "5m ago",
      unread: true,
    },
    {
      id: 2,
      title: "Support Ticket Updated",
      message: "Ticket #1234 has been updated by John Doe",
      time: "1h ago",
      unread: true,
    },
    {
      id: 3,
      title: "Contract Expiring Soon",
      message: "Gas contract for XYZ Ltd expires in 30 days",
      time: "2h ago",
      unread: false,
    },
    {
      id: 4,
      title: "New Customer Onboarded",
      message: "TechStart Inc has been successfully added",
      time: "1d ago",
      unread: false,
    },
    {
      id: 5,
      title: "Email Campaign Sent",
      message: "Monthly newsletter sent to 1,234 customers",
      time: "2d ago",
      unread: false,
    },
  ]

  const unreadCount = notifications.filter((n) => n.unread).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (localSearchQuery.trim()) {
      performSearch(localSearchQuery)
    }
  }

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
          {navigation.map((item) => {
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
                {item.badge && (
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
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.fullname || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
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
            <form onSubmit={handleSearch} className="relative w-96 max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users, businesses, quotes, tickets..."
                className="pl-9"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
              />
            </form>
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
                  >
                    Mark all as read
                  </Button>
                </div>
                <ScrollArea className="h-96">
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                          notification.unread && "bg-muted/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{notification.title}</p>
                              {notification.unread && <span className="h-2 w-2 rounded-full bg-accent" />}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{notification.time}</p>
                      </div>
                    ))}
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
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
