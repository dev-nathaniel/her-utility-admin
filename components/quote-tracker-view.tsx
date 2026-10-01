"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Plus,
  Zap,
  Phone,
  PhoneCall,
  Calendar,
  Building2,
  Mail,
  User,
  History,
  FileCheck2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { apiClient, type QuoteTrackerData } from "@/lib/api-client"
import { RecordContactDialog } from "./record-contact-dialog"
import { CreateQuoteTrackerDialog } from "./create-quote-tracker-dialog"
import { QuoteTrackerDetailsDialog } from "./quote-tracker-details-dialog"

export function QuoteTrackerView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [utilityFilter, setUtilityFilter] = useState("all")
  const [contactQuote, setContactQuote] = useState<QuoteTrackerData | null>(null)
  const [detailsQuoteId, setDetailsQuoteId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Fetch quotes list
  const { data: quoteTrackers = [], isLoading } = useQuery({
    queryKey: ["quote-tracker"],
    queryFn: () => apiClient.getQuoteTrackerList(),
    refetchInterval: 20000,
  })

  // Fetch KPIs
  const { data: kpis } = useQuery({
    queryKey: ["quote-tracker-kpis"],
    queryFn: () => apiClient.getQuoteTrackerKpis(),
    refetchInterval: 20000,
  })

  // Filter quotes
  const filteredQuotes = quoteTrackers.filter((q) => {
    const qTerm = searchQuery.toLowerCase()
    const matchesSearch =
      !qTerm ||
      (q.quote_reference || "").toLowerCase().includes(qTerm) ||
      (q.business_name || "").toLowerCase().includes(qTerm) ||
      (q.contact_name || "").toLowerCase().includes(qTerm) ||
      (q.contact_email || "").toLowerCase().includes(qTerm) ||
      (q.contact_phone || "").toLowerCase().includes(qTerm) ||
      (q.assigned_adviser_name || "").toLowerCase().includes(qTerm)

    const matchesStatus =
      statusFilter === "all" ? true : (q.status || "").toLowerCase() === statusFilter.toLowerCase()

    const matchesUtility =
      utilityFilter === "all" ? true : (q.utility_type || "").toLowerCase() === utilityFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesUtility
  })

  // Identify overdue quotes
  const overdueQuotes = quoteTrackers.filter((q) => {
    if (q.status === "signed_submitted" || q.status === "lost" || q.status === "quote_expired") return false
    if (q.is_overdue) return true
    if (q.next_action_at && new Date(q.next_action_at) < new Date()) return true
    return false
  })

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "follow_up_due":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">Follow-up Due</Badge>
      case "waiting_for_response":
        return (
          <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-400 font-semibold">
            Waiting for Response
          </Badge>
        )
      case "customer_considering":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Customer Considering</Badge>
      case "callback_requested":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">Callback Requested</Badge>
      case "requote_needed":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">Needs Re-quote</Badge>
      case "paperwork_sent":
        return <Badge className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">Paperwork Sent</Badge>
      case "signed_submitted":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Closed - Won (Signed)</Badge>
      case "lost":
        return <Badge variant="destructive" className="font-semibold">Closed - Lost</Badge>
      case "quote_expired":
        return <Badge variant="outline" className="text-muted-foreground font-semibold">Quote Expired</Badge>
      default:
        return <Badge variant="secondary" className="font-semibold">{status || "Pending"}</Badge>
    }
  }

  const columns: DataTableColumn<QuoteTrackerData>[] = [
    {
      key: "quote_reference",
      label: "Reference & Sent",
      sortable: true,
      render: (q) => (
        <div>
          <span className="font-mono font-bold text-xs text-foreground block">{q.quote_reference}</span>
          <span className="text-[11px] text-muted-foreground">
            Sent: {q.quote_sent_at ? new Date(q.quote_sent_at).toLocaleDateString() : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "business_name",
      label: "Customer & Business",
      sortable: true,
      render: (q) => (
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-xs text-foreground leading-snug">{q.business_name}</p>
            <p className="text-[11px] text-muted-foreground">
              {q.contact_name} {q.contact_phone ? `&bull; ${q.contact_phone}` : ""}
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
      key: "follow_up_attempt_count",
      label: "Follow-up Attempt",
      sortable: true,
      render: (q) => {
        const count = q.follow_up_attempt_count || 0
        const label =
          count === 0
            ? "Initial (0)"
            : `${count}${count === 1 ? "st" : count === 2 ? "nd" : count === 3 ? "rd" : "th"} Attempt`
        return (
          <Badge variant="outline" className="text-xs font-mono">
            <PhoneCall className="h-3 w-3 mr-1 text-muted-foreground" />
            {label}
          </Badge>
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
      key: "next_action_at",
      label: "Next Due",
      sortable: true,
      render: (q) => {
        if (!q.next_action_at) return <span className="text-xs text-muted-foreground">—</span>
        const isPast = new Date(q.next_action_at) < new Date() && !["signed_submitted", "lost", "quote_expired"].includes(q.status)
        return (
          <div className="flex items-center gap-1.5">
            {isPast ? (
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {new Date(q.next_action_at).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {new Date(q.next_action_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "assigned_adviser_name",
      label: "Adviser",
      sortable: true,
      render: (q) => (
        <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
          {q.assigned_adviser_name || "Unassigned"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (q) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs gap-1 font-medium bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
            onClick={() => setContactQuote(q)}
          >
            <Phone className="h-3 w-3" />
            Log Call
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => setDetailsQuoteId(q.id || (q as any)._id)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      {/* Overdue Alert Banner (Exact wording mandated) */}
      {overdueQuotes.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/40 border border-amber-300 dark:border-amber-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Overdue Follow-Up Action Required ({overdueQuotes.length} Quote{overdueQuotes.length > 1 ? "s" : ""})</span>
          </div>
          <div className="space-y-1.5">
            {overdueQuotes.slice(0, 3).map((q) => (
              <div
                key={q.id || (q as any)._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-background/80 border text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    Follow-up due: Quote #{q.quote_reference} was sent to {q.contact_name} ({q.business_name}) on{" "}
                    {new Date(q.quote_sent_at || q.created_at).toLocaleDateString()}.
                  </span>
                  <span className="text-muted-foreground block text-[11px] mt-0.5">
                    No response/outcome has been recorded. Assigned adviser: {q.assigned_adviser_name || "Unassigned"}.
                  </span>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 shrink-0 self-start sm:self-auto bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setContactQuote(q)}
                >
                  <Phone className="h-3 w-3" />
                  Record Follow-Up
                </Button>
              </div>
            ))}
            {overdueQuotes.length > 3 && (
              <p className="text-xs text-amber-800 dark:text-amber-300 italic pt-1">
                + {overdueQuotes.length - 3} more quote follow-ups currently due.
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Follow-up Due</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">
              {kpis ? kpis.follow_up_due : overdueQuotes.length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Waiting Response</p>
            <p className="text-2xl font-bold text-blue-600 mt-0.5">
              {kpis ? kpis.waiting_response : quoteTrackers.filter((q) => q.status === "waiting_for_response").length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Mail className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Considering</p>
            <p className="text-2xl font-bold text-indigo-600 mt-0.5">
              {kpis ? kpis.considering : quoteTrackers.filter((q) => q.status === "customer_considering").length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <User className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Won / Signed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">
              {kpis ? kpis.won : quoteTrackers.filter((q) => q.status === "signed_submitted").length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Quotes</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {kpis ? kpis.total : quoteTrackers.length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileCheck2 className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ref, customer, company, adviser..."
              className="pl-8 h-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="follow_up_due">Follow-up Due</SelectItem>
              <SelectItem value="waiting_for_response">Waiting for Response</SelectItem>
              <SelectItem value="customer_considering">Customer Considering</SelectItem>
              <SelectItem value="callback_requested">Callback Requested</SelectItem>
              <SelectItem value="requote_needed">Needs Re-quote</SelectItem>
              <SelectItem value="paperwork_sent">Paperwork Sent</SelectItem>
              <SelectItem value="signed_submitted">Closed - Won</SelectItem>
              <SelectItem value="lost">Closed - Lost</SelectItem>
              <SelectItem value="quote_expired">Quote Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={utilityFilter} onValueChange={setUtilityFilter}>
            <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
              <SelectValue placeholder="Utility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Utilities</SelectItem>
              <SelectItem value="electricity">Electricity</SelectItem>
              <SelectItem value="gas">Gas</SelectItem>
              <SelectItem value="water">Water</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          className="gap-1.5 h-9 text-xs font-semibold shrink-0"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Track New Quote
        </Button>
      </div>

      {/* Tracker Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredQuotes}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No outbound quotes match your search criteria."
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RecordContactDialog
        quote={contactQuote}
        open={!!contactQuote}
        onOpenChange={(open) => !open && setContactQuote(null)}
      />

      <CreateQuoteTrackerDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <QuoteTrackerDetailsDialog
        quoteId={detailsQuoteId}
        open={!!detailsQuoteId}
        onOpenChange={(open) => !open && setDetailsQuoteId(null)}
        onRecordContact={(quote) => {
          setDetailsQuoteId(null)
          setContactQuote(quote)
        }}
      />
    </div>
  )
}
