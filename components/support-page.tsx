"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, MessageSquare } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TicketDetailsDialog } from "./ticket-details-dialog"

export function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", searchQuery, statusFilter, priorityFilter],
    queryFn: async () => {
      // const response = await apiClient.getTickets({ search: searchQuery, status: statusFilter, priority: priorityFilter })
      // return response

      // Mock data - remove when API is ready
      return [
        {
          id: "TKT-1048",
          customer: "Acme Corporation",
          customerEmail: "contact@acme.com",
          subject: "Contract renewal inquiry",
          category: "Billing",
          priority: "High",
          status: "Open",
          assignee: "Support Team",
          created: "2024-01-15T10:30:00",
          lastUpdated: "2024-01-15T14:45:00",
          messages: [
            {
              id: 1,
              from: "customer",
              author: "John Doe",
              content:
                "We need information about renewing our contracts that expire next month. Can you provide pricing options?",
              timestamp: "2024-01-15T10:30:00",
            },
            {
              id: 2,
              from: "agent",
              author: "Support Team",
              content:
                "Thank you for reaching out. I'll have our account manager prepare a renewal proposal for you. They will contact you within 24 hours.",
              timestamp: "2024-01-15T14:45:00",
            },
          ],
        },
        {
          id: "TKT-1047",
          customer: "Global Industries Ltd",
          customerEmail: "info@globalind.com",
          subject: "Billing question regarding recent invoice",
          category: "Billing",
          priority: "Medium",
          status: "Open",
          assignee: "Finance Team",
          created: "2024-01-15T08:15:00",
          lastUpdated: "2024-01-15T09:20:00",
          messages: [
            {
              id: 1,
              from: "customer",
              author: "Jane Smith",
              content: "There appears to be a discrepancy in invoice #INV-2024-001. Can you review this?",
              timestamp: "2024-01-15T08:15:00",
            },
          ],
        },
        {
          id: "TKT-1046",
          customer: "TechStart Solutions",
          customerEmail: "hello@techstart.com",
          subject: "Request to add new site location",
          category: "Account",
          priority: "Low",
          status: "Resolved",
          assignee: "Account Manager",
          created: "2024-01-14T16:45:00",
          lastUpdated: "2024-01-15T11:30:00",
          messages: [
            {
              id: 1,
              from: "customer",
              author: "Mike Johnson",
              content: "We're opening a new office and need to add it to our account.",
              timestamp: "2024-01-14T16:45:00",
            },
            {
              id: 2,
              from: "agent",
              author: "Account Manager",
              content: "I've added the new site to your account. You can now manage contracts for this location.",
              timestamp: "2024-01-15T11:30:00",
            },
          ],
        },
        {
          id: "TKT-1045",
          customer: "Retail Plus Inc",
          customerEmail: "contact@retailplus.com",
          subject: "Technical issue with online portal",
          category: "Technical",
          priority: "High",
          status: "In Progress",
          assignee: "Tech Support",
          created: "2024-01-14T11:20:00",
          lastUpdated: "2024-01-14T15:40:00",
          messages: [
            {
              id: 1,
              from: "customer",
              author: "Sarah Lee",
              content: "I'm unable to log into the customer portal. Getting error 500.",
              timestamp: "2024-01-14T11:20:00",
            },
            {
              id: 2,
              from: "agent",
              author: "Tech Support",
              content: "We've identified the issue and are working on a fix. Should be resolved within 2 hours.",
              timestamp: "2024-01-14T15:40:00",
            },
          ],
        },
      ]
    },
  })

  const filteredTickets = tickets.filter((ticket: any) => {
    const matchesSearch =
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Management</h1>
        <p className="text-muted-foreground">View and respond to customer inquiries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3h</div>
            <p className="text-xs text-muted-foreground">-15% from last week</p>
          </CardContent>
        </Card>
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
                  <TableHead>Assignee</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <TableCell className="font-medium">{ticket.id}</TableCell>
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
                    <TableCell className="text-sm text-muted-foreground">{ticket.assignee}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ticket.lastUpdated).toLocaleString()}
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
                        <MessageSquare className="mr-2 h-4 w-4" />
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
        onOpenChange={(open) => !open && setSelectedTicket(null)}
      />
    </div>
  )
}
