"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Bell, RefreshCw, Zap, Flame, Droplets, PhoneCall, CheckCircle2 } from "lucide-react"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, type AlertData } from "@/lib/api-client"
import { toast } from "sonner"

export function ActivityLogPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [utilityFilter, setUtilityFilter] = useState("all")
  const [urgencyFilter, setUrgencyFilter] = useState("all")

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: () => apiClient.getAlerts(),
    refetchInterval: 30000,
  })

  const sweepMutation = useMutation({
    mutationFn: apiClient.runRenewalsSweep,
    onSuccess: (data) => {
      toast.success(data?.message || "Renewal sweep completed!")
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Sweep failed")
    },
  })

  const filteredAlerts = alerts.filter((a: any) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (a.user_email || "").toLowerCase().includes(q) ||
      (a.user_full_name || "").toLowerCase().includes(q) ||
      (a.utility_type || "").toLowerCase().includes(q) ||
      (a.contract_id || "").toLowerCase().includes(q)

    const matchesUtility =
      utilityFilter === "all" || (a.utility_type || "").toLowerCase() === utilityFilter.toLowerCase()

    const matchesUrgency =
      urgencyFilter === "all" || (a.urgency_level || "").toLowerCase() === urgencyFilter.toLowerCase()

    return matchesSearch && matchesUtility && matchesUrgency
  })

  const getUrgencyBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive" className="text-xs">Critical (&lt;30d)</Badge>
      case "high":
        return <Badge className="bg-amber-500 text-white text-xs">High (&lt;60d)</Badge>
      case "medium":
        return <Badge className="bg-yellow-500 text-white text-xs">Medium (&lt;90d)</Badge>
      case "renewable":
        return <Badge className="bg-blue-500 text-white text-xs">Renewable</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">Normal</Badge>
    }
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: "user_email",
      label: "Recipient & Client",
      sortable: true,
      render: (a) => (
        <div>
          <p className="font-semibold text-sm leading-snug">{a.user_full_name || a.user_email || "Client"}</p>
          <p className="text-xs text-muted-foreground">{a.user_email}</p>
        </div>
      ),
    },
    {
      key: "utility_type",
      label: "Utility",
      sortable: true,
      render: (a) => (
        <span className="capitalize text-xs font-semibold flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-purple-600" />
          {a.utility_type || "Energy"}
        </span>
      ),
    },
    {
      key: "days_to_expiry",
      label: "Expiry Window",
      sortable: true,
      render: (a) => (
        <span className="text-xs font-medium">
          {a.days_to_expiry != null ? `${a.days_to_expiry} days remaining` : "Notice open"}
        </span>
      ),
    },
    {
      key: "urgency_level",
      label: "Urgency",
      sortable: true,
      render: (a) => getUrgencyBadge(a.urgency_level),
    },
    {
      key: "sent_at",
      label: "Sent Timestamp",
      sortable: true,
      render: (a) => (
        <span className="text-xs text-muted-foreground">
          {a.sent_at ? new Date(a.sent_at).toLocaleString() : "—"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts &amp; Activity Log</h1>
          <p className="text-muted-foreground mt-0.5">
            Audit history of automated daily contract renewal sweeps and customer alerts.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sweepMutation.mutate()}
          disabled={sweepMutation.isPending}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${sweepMutation.isPending ? "animate-spin" : ""}`} />
          <span>{sweepMutation.isPending ? "Running Sweep..." : "Run Renewal Sweep Now"}</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, utility..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={utilityFilter} onValueChange={setUtilityFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Utility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Utilities</SelectItem>
              <SelectItem value="electricity">Electricity</SelectItem>
              <SelectItem value="gas">Gas</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="telecoms">Telecoms</SelectItem>
            </SelectContent>
          </Select>

          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgencies</SelectItem>
              <SelectItem value="critical">Critical (&lt;30d)</SelectItem>
              <SelectItem value="high">High (&lt;60d)</SelectItem>
              <SelectItem value="renewable">Renewable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredAlerts}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No renewal alerts sent yet. Alerts are generated during daily renewal sweeps."
          />
        </CardContent>
      </Card>
    </div>
  )
}
