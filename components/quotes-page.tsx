"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Clock, CheckCircle2, Eye, FileText, Zap, PhoneCall, Inbox, User } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QuoteDetailsDialog } from "./quote-details-dialog"
import { QuoteTrackerView } from "./quote-tracker-view"
import { apiClient, type QuoteData } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { useSearchParams } from "next/navigation"

export function QuotesPage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "tracker"
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null)

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
    const t = searchParams.get("tab")
    if (t) setActiveTab(t)
  }, [searchParams])

  // Inbound Quotes from customer mobile app / web wizard
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => apiClient.getQuotes(),
    refetchInterval: 30000,
  })

  const filteredQuotes = quotes.filter((q: any) => {
    const query = searchQuery.toLowerCase()
    const matchesQuery =
      (q.customer_name || "").toLowerCase().includes(query) ||
      (q.customer || "").toLowerCase().includes(query) ||
      (q.company_name || q.business_name || "").toLowerCase().includes(query) ||
      (q.utility_type || "").toLowerCase().includes(query) ||
      (q.supply_address || q.property_address || "").toLowerCase().includes(query) ||
      (q.postcode || "").toLowerCase().includes(query) ||
      (q.mprn || q.meter_point_number || "").toLowerCase().includes(query) ||
      (q.notes || "").toLowerCase().includes(query) ||
      (q.user_email || q.contact_email || "").toLowerCase().includes(query)

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
      key: "customer_name",
      label: "Customer & Business",
      sortable: true,
      render: (q) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-snug">
              {q.customer_name || q.contact_name || q.customer || "Customer"}
            </p>
            <p className="text-xs text-muted-foreground">
              {q.business_name || q.company_name ? (
                <span className="font-medium text-foreground/80">{q.business_name || q.company_name} &bull; </span>
              ) : null}
              {q.user_email || q.contact_email || ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "utility_type",
      label: "Utility",
      sortable: true,
      render: (q) => (
        <div className="flex items-center gap-1.5 capitalize text-xs font-medium">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span>{q.utility_type}</span>
        </div>
      ),
    },
    {
      key: "supply_address",
      label: "Supply Address & Postcode",
      sortable: true,
      render: (q) => (
        <div className="text-xs max-w-[200px]">
          <p className="font-medium truncate text-foreground" title={q.supply_address || q.property_address || ""}>
            {q.supply_address || q.property_address || "—"}
          </p>
          <p className="text-muted-foreground font-mono text-[11px]">
            {q.postcode || q.supply_postcode || ""}
          </p>
        </div>
      ),
    },
    {
      key: "end_date",
      label: "Contract End",
      sortable: true,
      render: (q) => {
        const endDate = q.end_date || q.contract_end_date
        const window = q.contract_end_window
        if (endDate) {
          const d = new Date(endDate)
          const formatted = Number.isNaN(d.getTime())
            ? endDate
            : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          return (
            <div>
              <span className="text-xs font-semibold text-foreground block">{formatted}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">Exact Date</span>
            </div>
          )
        }
        if (window) {
          const labels: Record<string, string> = {
            out_of_contract: "Out of contract",
            under_6m: "< 6 months",
            "6_12m": "6–12 months",
            over_12m: "> 12 months",
            dont_know: "Don't know",
            know_date: "Know date",
          }
          return <span className="text-xs text-muted-foreground">{labels[window] || window}</span>
        }
        return <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      key: "mprn",
      label: "MPRN / MPAN",
      sortable: true,
      render: (q) => {
        const mpx = q.mprn || q.meter_point_number
        if (!mpx) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <span className="font-mono text-xs font-medium bg-muted/60 px-2 py-0.5 rounded text-foreground">
            {mpx}
          </span>
        )
      },
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
          className="gap-1.5 h-8 text-xs font-medium bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
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
        <h1 className="text-3xl font-bold tracking-tight">Quotes &amp; Follow-Up Management</h1>
        <p className="text-muted-foreground mt-0.5">
          Track outbound transparent quotes, log follow-up contact attempts, and review inbound requests from the mobile app.
        </p>
      </div>

      {/* Main Tabs: Follow-Up Tracker vs Inbound Enquiries */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4" />
            <span>Follow-Up Tracker</span>
          </TabsTrigger>
          <TabsTrigger value="inbound" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span>Inbound Enquiries ({quotes.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Outbound Follow-Up Tracker */}
        <TabsContent value="tracker" className="space-y-5">
          <QuoteTrackerView />
        </TabsContent>

        {/* Tab 2: Inbound Customer Enquiries */}
        <TabsContent value="inbound" className="space-y-5">
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
        </TabsContent>
      </Tabs>

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
