"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Zap, Flame, Droplets, PhoneCall, AlertTriangle, Clock, Eye, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ContractDetailsDialog } from "./contract-details-dialog"
import { apiClient, type ContractData } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { useSearchParams } from "next/navigation"

export function ContractsPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [utilityFilter, setUtilityFilter] = useState("all")
  const [urgencyFilter, setUrgencyFilter] = useState("all")
  const [selectedContract, setSelectedContract] = useState<any | null>(null)

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => apiClient.getContracts(),
    refetchInterval: 30000,
  })

  const getUtilityIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "electricity":
        return <Zap className="h-4 w-4 text-amber-500" />
      case "gas":
        return <Flame className="h-4 w-4 text-orange-500" />
      case "water":
        return <Droplets className="h-4 w-4 text-blue-500" />
      case "telecoms":
      case "broadband":
        return <PhoneCall className="h-4 w-4 text-purple-500" />
      default:
        return <Zap className="h-4 w-4 text-purple-600" />
    }
  }

  const getUrgencyBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive" className="text-xs font-semibold">Critical (&lt;30d)</Badge>
      case "high":
        return <Badge className="bg-amber-500 text-white text-xs font-semibold">High (&lt;60d)</Badge>
      case "medium":
        return <Badge className="bg-yellow-500 text-white text-xs font-semibold">Medium (&lt;90d)</Badge>
      case "renewable":
        return <Badge className="bg-blue-500 text-white text-xs font-semibold">Renewable Now</Badge>
      case "expired":
        return <Badge variant="destructive" className="text-xs font-semibold">Expired</Badge>
      default:
        return <Badge variant="secondary" className="text-xs font-semibold">Normal</Badge>
    }
  }

  const filteredContracts = contracts.filter((c: any) => {
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      (c.supplier_name || "").toLowerCase().includes(q) ||
      (c.meter_number || "").toLowerCase().includes(q) ||
      (c.account_number || "").toLowerCase().includes(q) ||
      (c.customer || c.user_company || "").toLowerCase().includes(q) ||
      (c.property_address || c.site || "").toLowerCase().includes(q)

    const matchesUtility =
      utilityFilter === "all" || (c.utility_type || "").toLowerCase() === utilityFilter.toLowerCase()

    const matchesUrgency =
      urgencyFilter === "all" || (c.urgency_level || "").toLowerCase() === urgencyFilter.toLowerCase()

    return matchesQuery && matchesUtility && matchesUrgency
  })

  const columns: DataTableColumn<any>[] = [
    {
      key: "utility_type",
      label: "Utility & Supplier",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/60 flex-shrink-0">
            {getUtilityIcon(c.utility_type)}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{c.supplier_name || "Unknown Supplier"}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {c.utility_type || "Electricity"} &bull; <span className="font-mono">{c.meter_number || c.contractNumber}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Client & Location",
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-medium text-sm text-foreground">{c.user_company || c.customer}</p>
          <p className="text-xs text-muted-foreground truncate max-w-xs">{c.property_address || c.site}</p>
        </div>
      ),
    },
    {
      key: "end_date",
      label: "Expiry & Countdown",
      sortable: true,
      render: (c) => (
        <div>
          <p className="text-sm font-semibold">
            {c.end_date || c.contract_end_date ? new Date(c.end_date || c.contract_end_date).toLocaleDateString() : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {c.days_until_expiry != null
              ? c.days_until_expiry < 0
                ? `${Math.abs(c.days_until_expiry)}d ago`
                : `${c.days_until_expiry}d left`
              : "No date set"}
          </p>
        </div>
      ),
    },
    {
      key: "urgency_level",
      label: "Urgency",
      sortable: true,
      render: (c) => getUrgencyBadge(c.urgency_level),
    },
    {
      key: "unit_rate",
      label: "Tariff Rates",
      render: (c) => (
        <div className="text-xs">
          <p className="font-medium">{c.unit_rate ? `${c.unit_rate} p/kWh` : "—"}</p>
          <p className="text-muted-foreground">{c.standing_charge ? `${c.standing_charge} p/day` : "—"}</p>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (c) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setSelectedContract(c)}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Details</span>
        </Button>
      ),
    },
  ]

  const totalContracts = contracts.length
  const criticalCount = contracts.filter((c: any) => c.urgency_level === "critical").length
  const highCount = contracts.filter((c: any) => c.urgency_level === "high").length
  const renewableCount = contracts.filter((c: any) => c.urgency_level === "renewable" || c.renewable_now).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utility Contracts</h1>
        <p className="text-muted-foreground mt-0.5">
          Live electricity, gas, water, and telecoms agreements across all client sites.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Agreements</p>
            <p className="text-2xl font-bold mt-1">{totalContracts}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Zap className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Critical (&lt;30 days)</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{criticalCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Notice Open (&lt;60 days)</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{highCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Renewable Window</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{renewableCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Zap className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search supplier, meter, company..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={utilityFilter} onValueChange={setUtilityFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Utility Type" />
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
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredContracts}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No contracts found matching your filters."
          />
        </CardContent>
      </Card>

      {/* Contract Details Dialog */}
      {selectedContract && (
        <ContractDetailsDialog
          contract={selectedContract}
          open={!!selectedContract}
          onOpenChange={(open) => !open && setSelectedContract(null)}
        />
      )}
    </div>
  )
}
