"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, MessageSquare } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api-client"
import { TicketDetailsDialog } from "./ticket-details-dialog"
import { useSearchParams } from "next/navigation"

export function SupportPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])

  const { data: ticketsResponse, isLoading } = useQuery({
    queryKey: ["tickets", searchQuery, statusFilter, priorityFilter],
    queryFn: () => apiClient.getTickets({ 
      search: searchQuery, 
      status: statusFilter !== "all" ? statusFilter : undefined, 
      priority: priorityFilter !== "all" ? priorityFilter : undefined 
    }),
  })

  // Access tickets from the response structure { success: true, data: { tickets: [...] } }
  const tickets = ticketsResponse?.data?.tickets || [];

  // Server does filtering, but we keep client filter for immediate feedback if needed or rely on server refetch
  const filteredTickets = tickets; // api handles filtering based on query key params

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive"
      case "Medium":
        return "default"
      case "Low":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "destructive"
      case "In Progress":
        return "default"
      case "Resolved":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: apiClient.getDashboardStats,
  })
  
  const overview = statsData?.overview || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Management</h1>
        <p className="text-muted-foreground">View and respond to customer inquiries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.openTicketsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.inProgressTicketsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.resolvedTicketsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3h</div>
            <p className="text-xs text-muted-foreground">-15% from last week</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets by ID, customer, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading tickets...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  {/* <TableHead>Assignee</TableHead> */}
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket: any) => (
                  <TableRow key={ticket._id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <TableCell className="font-medium">{ticket._id.substring(ticket._id.length - 6).toUpperCase()}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.customer}</p>
                        <p className="text-xs text-muted-foreground">{ticket.customerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{ticket.subject}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                    </TableCell>
                    {/* <TableCell className="text-sm text-muted-foreground">{ticket.assignee}</TableCell> */}
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTicket(ticket)
                        }}
                      >
                        {/* <MessageSquare className="mr-2 h-4 w-4" /> */}
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <TicketDetailsDialog
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={(open: boolean) => !open && setSelectedTicket(null)}
      />
    </div>
  )
}
