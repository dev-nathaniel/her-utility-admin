"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Zap, Search, Building2, Eye, Filter } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BusinessDetailsDialog } from "./business-details-dialog"
import { useQuery } from "@tanstack/react-query"
import { apiClient, type CompanyData } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { useSearchParams } from "next/navigation"

export function BusinessesPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null)

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiClient.getCompanies(),
    refetchInterval: 30000,
  })

  useEffect(() => {
    const openId = searchParams.get("open")
    if (openId && companies.length > 0) {
      const biz = companies.find((b: any) => (b.id || b._id) === openId)
      if (biz) setSelectedBusiness(biz)
    }
  }, [searchParams, companies])

  const filteredCompanies = companies.filter((biz: any) => {
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      (biz.company_name || biz.name || "").toLowerCase().includes(q) ||
      (biz.email || "").toLowerCase().includes(q) ||
      (biz.full_name || "").toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || (biz.pipeline_status || "new_lead") === statusFilter
    return matchesQuery && matchesStatus
  })

  const getPipelineBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "new_lead":
        return <Badge variant="outline" className="border-blue-400 text-blue-600 dark:text-blue-400 font-semibold">New Lead</Badge>
      case "contacted":
        return <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 font-semibold">Contacted</Badge>
      case "quote_sent":
        return <Badge variant="outline" className="border-purple-400 text-purple-600 dark:text-purple-400 font-semibold">Quote Sent</Badge>
      case "customer":
        return <Badge className="bg-emerald-600 text-white font-semibold">Active Customer</Badge>
      case "lost":
        return <Badge variant="secondary">Lost</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUrgencyBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive" className="text-xs">Critical (&lt;30d)</Badge>
      case "high":
        return <Badge className="bg-amber-500 text-white text-xs">High (&lt;60d)</Badge>
      case "renewable":
        return <Badge className="bg-blue-500 text-white text-xs">Renewable</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">OK</Badge>
    }
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: "company_name",
      label: "Company / Account",
      sortable: true,
      render: (biz) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-bold text-xs">
              {(biz.company_name || biz.name || "C").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm leading-snug">{biz.company_name || biz.name}</p>
            <p className="text-xs text-muted-foreground">{biz.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "pipeline_status",
      label: "Pipeline Stage",
      sortable: true,
      render: (biz) => getPipelineBadge(biz.pipeline_status),
    },
    {
      key: "numberOfSites",
      label: "Sites",
      sortable: true,
      render: (biz) => (
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{biz.numberOfSites || 0}</span>
        </div>
      ),
    },
    {
      key: "numberOfContracts",
      label: "Contracts",
      sortable: true,
      render: (biz) => (
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Zap className="h-3.5 w-3.5 text-purple-600" />
          <span>{biz.numberOfContracts || 0}</span>
        </div>
      ),
    },
    {
      key: "urgency_level",
      label: "Urgency",
      render: (biz) => getUrgencyBadge(biz.urgency_level),
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (biz) => (
        <span className="text-xs text-muted-foreground">
          {biz.created_at ? new Date(biz.created_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (biz) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setSelectedBusiness(biz)}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Manage</span>
        </Button>
      ),
    },
  ]

  const totalCompanies = companies.length
  const activeCustomers = companies.filter((c: any) => c.pipeline_status === "customer").length
  const leads = companies.filter((c: any) => c.pipeline_status === "new_lead" || c.pipeline_status === "contacted").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies &amp; CRM Pipeline</h1>
          <p className="text-muted-foreground mt-0.5">
            Manage business client accounts, utility portfolios, and sales pipeline stages.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Accounts</p>
            <p className="text-2xl font-bold mt-1">{totalCompanies}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Building2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Customers</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCustomers}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Zap className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Open Leads &amp; Quotes</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{leads}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Filter className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Filter by Stage:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="new_lead">New Lead</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="quote_sent">Quote Sent</SelectItem>
              <SelectItem value="customer">Active Customer</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredCompanies}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No company accounts matching your search."
          />
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedBusiness && (
        <BusinessDetailsDialog
          business={selectedBusiness}
          open={!!selectedBusiness}
          onOpenChange={(open) => !open && setSelectedBusiness(null)}
        />
      )}
    </div>
  )
}
