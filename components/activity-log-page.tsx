"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, History } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/api-client"

interface ActivityEntry {
  _id: string
  action: string
  entity: string
  entityId: string
  performedBy: string
  details: string
  createdAt: string
}

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  created: "default",
  updated: "secondary",
  deleted: "destructive",
  login: "outline",
  logout: "outline",
}

export function ActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get("/activity-log")
        return response.data?.data || []
      } catch {
        return []
      }
    },
  })

  const filtered = useMemo(() => {
    let items = activities as ActivityEntry[]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (a) =>
          a.action?.toLowerCase().includes(q) ||
          a.entity?.toLowerCase().includes(q) ||
          a.details?.toLowerCase().includes(q) ||
          a.performedBy?.toLowerCase().includes(q),
      )
    }
    if (entityFilter !== "all") items = items.filter((a) => a.entity === entityFilter)
    if (actionFilter !== "all") items = items.filter((a) => a.action === actionFilter)
    return items
  }, [activities, searchQuery, entityFilter, actionFilter])

  const columns = [
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (entry) => (
        <Badge variant={actionColors[entry.action] || "outline"} className="capitalize">
          {entry.action}
        </Badge>
      ),
    },
    {
      key: "entity",
      label: "Entity",
      sortable: true,
      render: (entry) => <span className="capitalize">{entry.entity}</span>,
    },
    {
      key: "details",
      label: "Details",
      sortable: true,
      render: (entry) => <span className="text-sm">{entry.details}</span>,
    },
    {
      key: "performedBy",
      label: "Performed By",
      sortable: true,
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-muted-foreground">
          {new Date(entry.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground">Track admin actions, logins, and system changes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="quote">Quote</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!isLoading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No activity recorded</h3>
              <p className="text-sm text-muted-foreground">
                Admin actions and system changes will appear here.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              pageSize={20}
              exportable
              exportFilename="activity-log"
              emptyMessage="No matching activity found"
              rowKey={(e) => e._id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
