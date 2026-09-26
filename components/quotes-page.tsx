"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Clock, CheckCircle2, XCircle, Eye, FileText, Zap } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QuoteDetailsDialog } from "./quote-details-dialog"
import { apiClient, type QuoteData } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { useSearchParams } from "next/navigation"

export function QuotesPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null)

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => apiClient.getQuotes(),
    refetchInterval: 30000,
  })

  const filteredQuotes = quotes.filter((q: any) => {
    const query = searchQuery.toLowerCase()
    const matchesQuery =
      (q.company_name || q.customer || "").toLowerCase().includes(query) ||
      (q.utility_type || "").toLowerCase().includes(query) ||
      (q.notes || "").toLowerCase().includes(query) ||
      (q.user_email || "").toLowerCase().includes(query)

    const matchesStatus =
      statusFilter === "all"
        ? true
        : (q.status || "pending").toLowerCase() === statusFilter.toLowerCase()

    return matchesQuery && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "quoted":
        return <Badge className="bg-emerald-600 text-white font-semibold">Quoted</Badge>
      case "accepted":
        return <Badge className="font-semibold">Accepted</Badge>
      case "rejected":
        return <Badge variant="destructive" className="font-semibold">Rejected</Badge>
      default:
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 font-semibold gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        )
    }
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: "company_name",
      label: "Customer / Account",
      sortable: true,
      render: (q) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-snug">{q.company_name || q.customer || "Client"}</p>
            <p className="text-xs text-muted-foreground">{q.user_email || ""}</p>
          </div>
        </div>
      ),
    },
    {
      key: "utility_type",
      label: "Utility",
      sortable: true,
      render: (q) => (
        <div className="flex items-center gap-1.5 capitalize text-sm font-medium">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span>{q.utility_type}</span>
        </div>
      ),
    },
    {
      key: "current_spend",
      label: "Current Spend",
      sortable: true,
      render: (q) => (
        <span className="text-sm font-semibold">
          {q.current_spend ? `£${q.current_spend}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (q) => getStatusBadge(q.status),
    },
    {
      key: "created_at",
      label: "Submitted",
      sortable: true,
      render: (q) => (
        <span className="text-xs text-muted-foreground">
          {q.created_at ? new Date(q.created_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (q) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs font-medium"
          onClick={() => setSelectedQuote(q)}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Details</span>
        </Button>
      ),
    },
  ]

  const totalQuotes = quotes.length
  const pendingCount = quotes.filter((q: any) => !q.status || q.status === "pending").length
  const quotedCount = quotes.filter((q: any) => q.status === "quoted").length
  const acceptedCount = quotes.filter((q: any) => q.status === "accepted").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quote Enquiries</h1>
        <p className="text-muted-foreground mt-0.5">
          Review quote requests submitted by customers from the mobile app quote wizard and website.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Enquiries</p>
            <p className="text-2xl font-bold mt-1">{totalQuotes}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <FileText className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Offers Quoted</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{quotedCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Accepted Contracts</p>
            <p className="text-2xl font-bold text-primary mt-1">{acceptedCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Zap className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company, utility, notes..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quotes Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredQuotes}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No quote requests matching your search."
          />
        </CardContent>
      </Card>

      {/* Quote Details Dialog */}
      {selectedQuote && (
        <QuoteDetailsDialog
          quote={selectedQuote}
          open={!!selectedQuote}
          onOpenChange={(open) => !open && setSelectedQuote(null)}
        />
      )}
    </div>
  )
}
