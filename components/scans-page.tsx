"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileCheck,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  PhoneCall,
  RefreshCw,
  Clock,
  AlertCircle,
  FileText,
  Zap,
} from "lucide-react"
import { apiClient, type ScanData } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { toast } from "sonner"

export function ScansPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null)
  const [selectedContractId, setSelectedContractId] = useState("")

  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["admin-scans"],
    queryFn: () => apiClient.getScans(),
    refetchInterval: 15000,
  })

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => apiClient.getContracts(),
  })

  const applyScanMutation = useMutation({
    mutationFn: (scanId: string) =>
      apiClient.applyScanToContract(scanId, selectedContractId ? { contract_id: selectedContractId } : {}),
    onSuccess: (data) => {
      toast.success(data?.message || "Bill scan applied to contract successfully!")
      setSelectedScan(null)
      queryClient.invalidateQueries({ queryKey: ["admin-scans"] })
      queryClient.invalidateQueries({ queryKey: ["queue-stats"] })
      queryClient.invalidateQueries({ queryKey: ["contracts"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to apply scan to contract")
    },
  })

  const rejectScanMutation = useMutation({
    mutationFn: (scanId: string) => apiClient.rejectScan(scanId, "Rejected by broker review"),
    onSuccess: () => {
      toast.success("Bill scan rejected")
      setSelectedScan(null)
      queryClient.invalidateQueries({ queryKey: ["admin-scans"] })
      queryClient.invalidateQueries({ queryKey: ["queue-stats"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to reject scan")
    },
  })

  const sanityCheckMutation = useMutation({
    mutationFn: (scanId: string) => apiClient.rerunScanSanityCheck(scanId),
    onSuccess: (data) => {
      toast.success("Sanity check rerun completed")
      queryClient.invalidateQueries({ queryKey: ["admin-scans"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Sanity check failed")
    },
  })

  const filteredScans = scans.filter((s: any) => {
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      (s.filename || "").toLowerCase().includes(q) ||
      (s.customer_email || s.user_email || "").toLowerCase().includes(q) ||
      (s.customer_company || s.user_company || "").toLowerCase().includes(q) ||
      (s.customer_name || s.user_full_name || "").toLowerCase().includes(q)

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "pending"
        ? s.status === "pending_review" || !s.status
        : s.status === statusFilter

    return matchesQuery && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
      case undefined:
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 font-semibold gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        )
      case "applied":
        return (
          <Badge className="bg-emerald-600 text-white font-semibold gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Applied
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="font-semibold gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: "filename",
      label: "Bill Document",
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-snug">{s.filename || "Uploaded Bill"}</p>
            <p className="text-xs text-muted-foreground">
              {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "customer_company",
      label: "Customer / Account",
      sortable: true,
      render: (s) => (
        <div>
          <p className="font-medium text-sm text-foreground">
            {s.customer_company || s.user_company || s.customer_name || "Client"}
          </p>
          <p className="text-xs text-muted-foreground">{s.customer_email || s.user_email}</p>
        </div>
      ),
    },
    {
      key: "call_requested",
      label: "Call Requested?",
      render: (s) =>
        s.call_requested_at ? (
          <Badge className="bg-rose-600 text-white gap-1 text-xs">
            <PhoneCall className="h-3 w-3" />
            Call Requested
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (s) => getStatusBadge(s.status),
    },
    {
      key: "actions",
      label: "",
      render: (s) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs font-medium"
          onClick={() => {
            setSelectedScan(s)
            setSelectedContractId("")
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Review OCR</span>
        </Button>
      ),
    },
  ]

  const pendingCount = scans.filter((s: any) => s.status === "pending_review" || !s.status).length
  const appliedCount = scans.filter((s: any) => s.status === "applied").length
  const callRequestsCount = scans.filter((s: any) => s.call_requested_at).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bill Scans Review Queue</h1>
        <p className="text-muted-foreground mt-0.5">
          Process smart OCR bill uploads from mobile app users, review extracted rates, and apply to contracts.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pending Broker Review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Calls Requested by Client</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{callRequestsCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <PhoneCall className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Successfully Applied</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{appliedCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by filename, company, email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Filter Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scans</SelectItem>
              <SelectItem value="pending">Pending Review Only</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scans Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredScans}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No bill scans matching your search."
          />
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedScan && (
        <Dialog open={!!selectedScan} onOpenChange={(open) => !open && setSelectedScan(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-purple-600" />
                    <span>Review Smart Bill OCR Scan</span>
                  </DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {selectedScan.customer_company || selectedScan.customer_name} &bull;{" "}
                    {selectedScan.customer_email}
                  </DialogDescription>
                </div>
                {getStatusBadge(selectedScan.status)}
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Call Requested Banner */}
              {selectedScan.call_requested_at && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3">
                  <PhoneCall className="h-5 w-5 text-rose-600" />
                  <div>
                    <p className="text-xs font-bold text-rose-800 dark:text-rose-200">Customer requested a phone call</p>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Requested on {new Date(selectedScan.call_requested_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted OCR Data */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      GPT-4o Vision Extracted Data
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sanityCheckMutation.mutate(selectedScan.id || selectedScan._id)}
                      disabled={sanityCheckMutation.isPending}
                      className="h-7 text-xs gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${sanityCheckMutation.isPending ? "animate-spin" : ""}`} />
                      <span>Rerun Sanity Check</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {selectedScan.extracted_data ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs text-muted-foreground block">Supplier</span>
                        <span className="font-semibold">{selectedScan.extracted_data.supplier || "—"}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs text-muted-foreground block">Utility Type</span>
                        <span className="font-semibold capitalize">{selectedScan.extracted_data.utility_type || "—"}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs text-muted-foreground block">Meter / MPAN / MPRN</span>
                        <span className="font-semibold font-mono">
                          {selectedScan.extracted_data.meter_number || selectedScan.extracted_data.mpan_mprn || "—"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs text-muted-foreground block">Contract End Date</span>
                        <span className="font-semibold">
                          {selectedScan.extracted_data.contract_end_date
                            ? new Date(selectedScan.extracted_data.contract_end_date).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs text-muted-foreground block">Unit Rate</span>
                        <span className="font-semibold">
                          {selectedScan.extracted_data.unit_rate ? `${selectedScan.extracted_data.unit_rate} p/kWh` : "—"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-muted/20">
                        <span className="text-xs text-muted-foreground block">Standing Charge</span>
                        <span className="font-semibold">
                          {selectedScan.extracted_data.standing_charge ? `${selectedScan.extracted_data.standing_charge} p/day` : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border text-center text-xs text-muted-foreground">
                      Document uploaded: <span className="font-semibold text-foreground">{selectedScan.filename}</span>
                      <p className="mt-1">OCR extraction pending or processed as raw image.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Apply Target Contract Selector */}
              {selectedScan.status !== "applied" && (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Attach to Existing Contract (Optional):</p>
                  <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Auto-detect or select a contract..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Auto-create or match existing</SelectItem>
                      {contracts
                        .filter((c: any) => c.user_id === selectedScan.user_id)
                        .map((c: any) => (
                          <SelectItem key={c.id || c._id} value={c.id || c._id}>
                            {c.utility_type} &bull; {c.supplier_name} &bull; {c.meter_number || "No meter"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectScanMutation.mutate(selectedScan.id || selectedScan._id)}
                      disabled={rejectScanMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Reject Scan
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => applyScanMutation.mutate(selectedScan.id || selectedScan._id)}
                      disabled={applyScanMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{applyScanMutation.isPending ? "Applying..." : "Approve & Apply to Contract"}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
