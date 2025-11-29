"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Clock, CheckCircle2, XCircle, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { QuoteDetailsDialog } from "./quote-details-dialog"

export function QuotesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedQuote, setSelectedQuote] = useState<any>(null)

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", searchQuery, statusFilter],
    queryFn: async () => {
      // const response = await apiClient.getQuotes({ search: searchQuery, status: statusFilter })
      // return response

      // Mock data - remove when API is ready
      return [
        {
          id: "QTE-1048",
          customer: "Retail Plus Inc",
          email: "contact@retailplus.com",
          utilityType: "Electricity",
          sites: 5,
          estimatedValue: "$125,000",
          status: "Pending Review",
          priority: "High",
          submittedDate: "2024-01-15T10:30:00",
          message:
            "Looking to switch electricity provider for 5 retail locations. Current contract expires in 2 months.",
        },
      ]
    },
  })

  const filteredQuotes = quotes.filter((quote: any) => {
    const matchesSearch =
      quote.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending Review":
        return <Clock className="h-4 w-4" />
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "Quoted":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "Accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Pending Review":
        return "destructive"
      case "In Progress":
        return "default"
      case "Quoted":
        return "secondary"
      case "Accepted":
        return "default"
      case "Rejected":
        return "outline"
      default:
        return "secondary"
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quote Enquiries</h1>
        <p className="text-muted-foreground">Manage quote requests from customers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quoted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Sent to customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">This month</p>
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
                placeholder="Search by customer name or quote ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Quoted">Quoted</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading quotes...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Utility Type</TableHead>
                  {/* <TableHead>Sites</TableHead> */}
                  <TableHead>Est. Value</TableHead>
                  {/* <TableHead>Priority</TableHead> */}
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className="cursor-pointer" onClick={() => setSelectedQuote(quote)}>
                    <TableCell className="font-medium">{quote.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quote.customer}</p>
                        <p className="text-xs text-muted-foreground">{quote.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{quote.utilityType}</Badge>
                    </TableCell>
                    {/* <TableCell>{quote.sites}</TableCell> */}
                    <TableCell className="font-medium">{quote.estimatedValue}</TableCell>
                    {/* <TableCell>
                      <Badge variant={getPriorityVariant(quote.priority)}>{quote.priority}</Badge>
                    </TableCell> */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* {getStatusIcon(quote.status)} */}
                        <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(quote.submittedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedQuote(quote)
                        }}
                      >
                        {/* <Eye className="mr-2 h-4 w-4" /> */}
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

      {/* Quote Details Dialog */}
      <QuoteDetailsDialog
        quote={selectedQuote}
        open={!!selectedQuote}
        onOpenChange={(open) => !open && setSelectedQuote(null)}
      />
    </div>
  )
}
