"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  FileText,
  FileCheck,
  Zap,
  ArrowRight,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Building2,
  MessagesSquare,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

export function DashboardOverview() {
  const queryClient = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 30000,
  })

  const { data: queueStats } = useQuery({
    queryKey: ["queue-stats"],
    queryFn: apiClient.getQueueStats,
    refetchInterval: 15000,
  })

  const { data: recentCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["recent-customers"],
    queryFn: () => apiClient.getRecentCustomers(6),
    refetchInterval: 30000,
  })

  const renewalSweepMutation = useMutation({
    mutationFn: apiClient.runRenewalsSweep,
    onSuccess: (data) => {
      toast.success(data?.message || "Renewal sweep completed successfully!")
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["recent-customers"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Renewal sweep failed")
    },
  })

  const urgency = stats?.urgency || {
    critical: 0,
    high: 0,
    medium: 0,
    renewable: 0,
    normal: 0,
    expired: 0,
    low: 0,
  }

  const kpis = [
    {
      title: "Active Contracts",
      value: stats?.contracts ?? 0,
      subtext: `${urgency.critical + urgency.high} need urgent broker review`,
      icon: Zap,
      href: "/dashboard/contracts",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-950/60",
    },
    {
      title: "Registered Users",
      value: stats?.users ?? 0,
      subtext: `${stats?.properties ?? 0} customer sites attached`,
      icon: Users,
      href: "/dashboard/users",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-950/60",
    },
    {
      title: "Pending Bill Scans",
      value: queueStats?.pending ?? 0,
      subtext: queueStats?.call_requested ? `${queueStats.call_requested} requested a phone call` : "Smart OCR uploads from mobile app",
      icon: FileCheck,
      href: "/dashboard/scans",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-950/60",
    },
    {
      title: "Quote Requests",
      value: stats?.pending_quotes ?? 0,
      subtext: `${stats?.quotes_all_time ?? 0} total enquiries submitted`,
      icon: FileText,
      href: "/dashboard/quotes",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-950/60",
    },
  ]

  const getUrgencyBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive" className="font-semibold text-xs">Critical (&lt;30d)</Badge>
      case "high":
        return <Badge className="bg-amber-500 text-white font-semibold text-xs">High (&lt;60d)</Badge>
      case "medium":
        return <Badge className="bg-yellow-500 text-white font-semibold text-xs">Medium (&lt;90d)</Badge>
      case "renewable":
        return <Badge className="bg-blue-500 text-white font-semibold text-xs">Renewable</Badge>
      case "expired":
        return <Badge variant="destructive" className="font-semibold text-xs">Expired</Badge>
      default:
        return <Badge variant="secondary" className="font-semibold text-xs">OK</Badge>
    }
  }

  const getPipelineBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "new_lead":
        return <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-400">New Lead</Badge>
      case "contacted":
        return <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400">Contacted</Badge>
      case "quote_sent":
        return <Badge variant="outline" className="border-purple-400 text-purple-600 dark:text-purple-400">Quote Sent</Badge>
      case "customer":
        return <Badge className="bg-emerald-600 text-white">Active Customer</Badge>
      case "lost":
        return <Badge variant="secondary">Lost</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Sweep Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Price Buddy Broker Hub</h1>
          <p className="text-muted-foreground mt-1">
            Real-time contracts, bill scans, and customer operations across web &amp; mobile app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => renewalSweepMutation.mutate()}
            disabled={renewalSweepMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${renewalSweepMutation.isPending ? "animate-spin" : ""}`} />
            <span>{renewalSweepMutation.isPending ? "Running Sweep..." : "Run Renewal Sweep"}</span>
          </Button>
          <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Link href="/dashboard/scans">
              <FileCheck className="h-4 w-4" />
              <span>Review Bill Scans</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-sm cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{statsLoading ? "—" : kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.subtext}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Urgency Radar Card */}
      <Card className="border-l-4 border-l-purple-600">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                <span>Contract Renewal Urgency Radar</span>
              </CardTitle>
              <CardDescription>
                Proactive alerts for customer contracts approaching their supplier notice or end window
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/contracts" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
                View all contracts &rarr;
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Critical (&lt;30d)
              </p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-200 mt-1">{urgency.critical}</p>
              <p className="text-[10px] text-red-600/80 mt-0.5">Immediate broker quote</p>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                High (&lt;60d)
              </p>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1">{urgency.high}</p>
              <p className="text-[10px] text-amber-600/80 mt-0.5">Notice window open</p>
            </div>

            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900/50">
              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                Medium (&lt;90d)
              </p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mt-1">{urgency.medium}</p>
              <p className="text-[10px] text-yellow-600/80 mt-0.5">Pre-renewal audit</p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Renewable
              </p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1">{urgency.renewable}</p>
              <p className="text-[10px] text-blue-600/80 mt-0.5">&lt;180 days to end</p>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Normal
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">{urgency.normal}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Mid-term contract</p>
            </div>

            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Expired
              </p>
              <p className="text-2xl font-bold text-rose-800 dark:text-rose-200 mt-1">{urgency.expired}</p>
              <p className="text-[10px] text-rose-600/80 mt-0.5">Out of contract rates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Recent Customers + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Customers Feed (2 columns) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Recent Customer Activity</CardTitle>
              <CardDescription>Live client updates from mobile app and web</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/businesses" className="text-xs">
                View all companies
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading recent activity...</div>
            ) : recentCustomers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No recent customers found</div>
            ) : (
              <div className="divide-y divide-border">
                {recentCustomers.map((cust) => (
                  <div key={cust.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs font-bold">
                          {(cust.company_name || cust.email || "C").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{cust.company_name}</p>
                          {getPipelineBadge(cust.pipeline_status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {cust.last_activity_summary || cust.full_name || cust.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getUrgencyBadge(cust.urgency_level)}
                      <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                        <Link href={`/dashboard/businesses?open=${cust.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Operations & Broker Workflow */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Broker Quick Actions</CardTitle>
              <CardDescription>Common operations across the portfolio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11 text-sm font-medium">
                <Link href="/dashboard/scans">
                  <FileCheck className="h-4 w-4 text-purple-600" />
                  <span>Review Bill Scans Queue</span>
                  {queueStats?.pending ? (
                    <Badge className="ml-auto bg-purple-600 text-white text-xs">{queueStats.pending}</Badge>
                  ) : null}
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11 text-sm font-medium">
                <Link href="/dashboard/support">
                  <MessagesSquare className="h-4 w-4 text-blue-600" />
                  <span>Concierge Customer Chat</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11 text-sm font-medium">
                <Link href="/dashboard/quotes">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>Manage Quote Enquiries</span>
                  {stats?.pending_quotes ? (
                    <Badge className="ml-auto bg-emerald-600 text-white text-xs">{stats.pending_quotes}</Badge>
                  ) : null}
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11 text-sm font-medium">
                <Link href="/dashboard/contracts">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span>View All Utility Contracts</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11 text-sm font-medium">
                <Link href="/dashboard/users">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span>Manage Users &amp; Permissions</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Mobile App Sync Status */}
          <Card className="bg-muted/40">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-semibold text-foreground">Mobile App &amp; Backend Sync Active</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Customer quotes, bill scans, and concierge messages from iOS / Android connect directly into this console.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
