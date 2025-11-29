"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, FileText, HeadphonesIcon, Zap, TrendingUp, ArrowRight, Clock, CheckCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"




const recentCustomers = [
  {
    name: "Acme Corporation",
    email: "contact@acme.com",
    status: "Active",
    contracts: 12,
    addedDate: "2 hours ago",
  },
  {
    name: "Global Industries Ltd",
    email: "info@globalind.com",
    status: "Active",
    contracts: 8,
    addedDate: "5 hours ago",
  },
  {
    name: "TechStart Solutions",
    email: "hello@techstart.com",
    status: "Pending",
    contracts: 3,
    addedDate: "1 day ago",
  },
]

const recentQuotes = [
  {
    customer: "Retail Plus Inc",
    type: "Electricity",
    sites: 5,
    status: "Pending Review",
    date: "1 hour ago",
  },
  {
    customer: "Manufacturing Co",
    type: "Gas & Electricity",
    sites: 12,
    status: "In Progress",
    date: "3 hours ago",
  },
  {
    customer: "Office Solutions",
    type: "Gas",
    sites: 2,
    status: "Pending Review",
    date: "6 hours ago",
  },
]

const recentTickets = [
  {
    id: "TKT-1048",
    customer: "Acme Corporation",
    subject: "Contract renewal inquiry",
    priority: "High",
    status: "Open",
    time: "30 mins ago",
  },
  {
    id: "TKT-1047",
    customer: "Global Industries Ltd",
    subject: "Billing question",
    priority: "Medium",
    status: "Open",
    time: "2 hours ago",
  },
  {
    id: "TKT-1046",
    customer: "TechStart Solutions",
    subject: "Site addition request",
    priority: "Low",
    status: "Resolved",
    time: "5 hours ago",
  },
]

export function DashboardOverview() {
  const { data: response } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => {
      return apiClient.getDashboardStats()
    },
  })

  const overview = response?.overview || {}

  const stats = [
    {
      title: "Total Businesses",
      value: overview.businessCount || 0,
      icon: Users,
      // description: "Total registered businesses",
      change: "+12%",
      trend: "up",
    },
    {
      title: "Pending Quotes",
      value: overview.pendingQuotesCount || 0,
      icon: FileText,
      // description: "Quotes awaiting review",
      change: "+5%",
      trend: "up",
    },
    {
      title: "Open Tickets",
      value: overview.openTicketsCount || 0,
      icon: HeadphonesIcon,
      // description: "Open tickets awaiting response",
      change: "-3%",
      trend: "down",
    },
    {
      title: "Active Contracts",
      value: overview.contractsCount || 0,
      icon: Zap,
      // description: "Currently active contracts",
      change: "+8%",
      trend: "up",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`flex items-center gap-1 text-xs ${stat.trend === 'up' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                <TrendingUp className={`h-3 w-3 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Businesses</CardTitle>
              <CardDescription>Latest business onboardings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/customers">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCustomers.map((customer) => (
                <div key={customer.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{customer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{customer.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={customer.status === "Active" ? "default" : "secondary"}
                      className={customer.status === "Active" ? "bg-accent text-accent-foreground mb-1" : "mb-1"}
                    >
                      {customer.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{customer.contracts} contracts</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Quote Enquiries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quote Enquiries</CardTitle>
              <CardDescription>Recent quote requests</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/quotes">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuotes.map((quote, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{quote.customer}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {quote.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{quote.sites} sites</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={quote.status === "Pending Review" ? "destructive" : "secondary"}>
                      {quote.status}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{quote.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Support Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Support Tickets</CardTitle>
              <CardDescription>Latest customer inquiries and issues</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/support">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {ticket.status === "Resolved" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                      ) : (
                        <HeadphonesIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ticket.id}</p>
                        <Badge
                          variant={
                            ticket.priority === "High"
                              ? "destructive"
                              : ticket.priority === "Medium"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{ticket.subject}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{ticket.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={ticket.status === "Resolved" ? "outline" : "default"}
                      className={ticket.status === "Open" ? "bg-accent text-accent-foreground" : ""}
                    >
                      {ticket.status}
                    </Badge>
                    <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {ticket.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/customers?action=new">
                <Users className="mr-2 h-4 w-4" />
                Add New Customer
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/quotes">
                <FileText className="mr-2 h-4 w-4" />
                Review Quotes
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/emails?action=compose">
                <Users className="mr-2 h-4 w-4" />
                Send Email Blast
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/content?action=new">
                <Users className="mr-2 h-4 w-4" />
                Publish News
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
