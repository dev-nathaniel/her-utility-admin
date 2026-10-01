"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  FileText,
  Upload,
  Eye,
  Download,
  ShieldCheck,
  Lock,
  Globe,
  Trash2,
  Building2,
  Zap,
  Filter,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { apiClient, type DocumentData } from "@/lib/api-client"
import { toast } from "sonner"
import { UploadDocumentDialog } from "./upload-document-dialog"

export function DocumentsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [visibilityFilter, setVisibilityFilter] = useState("all")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedCompanyForUpload, setSelectedCompanyForUpload] = useState<any>(null)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiClient.getDocuments(),
    refetchInterval: 30000,
  })

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiClient.getCompanies(),
  })

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ docId, isVisible }: { docId: string; isVisible: boolean }) =>
      apiClient.updateDocument(docId, { is_customer_visible: isVisible }),
    onSuccess: () => {
      toast.success("Document customer visibility updated")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update visibility")
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => apiClient.deleteDocument(docId),
    onSuccess: () => {
      toast.success("Document marked superseded / archived")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to archive document")
    },
  })

  const handleDownload = async (docId: string, action: "view" | "download" = "view") => {
    try {
      const res = await apiClient.getDocumentDownloadUrl(docId, action)
      if (res.download_url) {
        window.open(res.download_url, "_blank")
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to generate presigned download URL")
    }
  }

  const formatDocType = (type?: string) => {
    switch (type) {
      case "quote":
        return "Transparent Quote"
      case "signed_loa":
        return "Signed LOA"
      case "unsigned_loa":
        return "Draft LOA"
      case "contract":
        return "Utility Contract"
      case "bill":
        return "Bill / Statement"
      case "supplier_letter":
        return "Supplier Letter"
      case "renewal_reminder":
        return "Renewal Notice"
      case "report":
        return "Audit Report"
      default:
        return "Document"
    }
  }

  const filteredDocs = documents.filter((d: DocumentData) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      !q ||
      (d.document_name || "").toLowerCase().includes(q) ||
      (d.supplier_name || "").toLowerCase().includes(q) ||
      (d.user_company || "").toLowerCase().includes(q) ||
      (d.user_email || "").toLowerCase().includes(q) ||
      (d.user_full_name || "").toLowerCase().includes(q)

    const matchesType =
      typeFilter === "all" ? true : (d.document_type || "").toLowerCase() === typeFilter.toLowerCase()

    const matchesVisibility =
      visibilityFilter === "all"
        ? true
        : visibilityFilter === "visible"
        ? d.is_customer_visible === true
        : d.is_customer_visible === false

    return matchesSearch && matchesType && matchesVisibility
  })

  const totalDocs = documents.length
  const customerVisibleCount = documents.filter((d: DocumentData) => d.is_customer_visible).length
  const internalCount = totalDocs - customerVisibleCount
  const loaCount = documents.filter((d: DocumentData) => d.document_type === "signed_loa").length

  const columns: DataTableColumn<DocumentData>[] = [
    {
      key: "document_name",
      label: "Document Title",
      sortable: true,
      render: (d) => (
        <div className="flex items-start gap-2.5 max-w-[280px]">
          <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="truncate">
            <p className="font-semibold text-xs text-foreground truncate">{d.document_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {d.supplier_name ? `${d.supplier_name} • ` : ""}
              {d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(0)} KB` : "PDF"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "user_company",
      label: "Client / Business",
      sortable: true,
      render: (d) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{d.user_company || "Business Client"}</p>
          <p className="text-[11px] text-muted-foreground">{d.user_email || ""}</p>
        </div>
      ),
    },
    {
      key: "document_type",
      label: "Category",
      sortable: true,
      render: (d) => (
        <Badge variant="outline" className="text-xs font-medium">
          {formatDocType(d.document_type)}
        </Badge>
      ),
    },
    {
      key: "utility_type",
      label: "Utility",
      sortable: true,
      render: (d) =>
        d.utility_type ? (
          <div className="flex items-center gap-1.5 capitalize text-xs font-medium">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>{d.utility_type}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "is_customer_visible",
      label: "Visibility",
      sortable: true,
      render: (d) =>
        d.is_customer_visible ? (
          <button
            type="button"
            onClick={() => toggleVisibilityMutation.mutate({ docId: d.id, isVisible: false })}
            title="Click to switch to internal only"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:opacity-80 transition"
          >
            <Globe className="h-3 w-3" />
            Customer-Visible
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toggleVisibilityMutation.mutate({ docId: d.id, isVisible: true })}
            title="Click to make visible to customer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground hover:opacity-80 transition"
          >
            <Lock className="h-3 w-3" />
            Internal Only
          </button>
        ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (d) => (
        <Badge
          variant={
            d.status === "active" || d.status === "current"
              ? "secondary"
              : d.status === "expired"
              ? "destructive"
              : "outline"
          }
          className="text-xs capitalize font-medium"
        >
          {d.status || "Current"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      label: "Uploaded",
      sortable: true,
      render: (d) => (
        <span className="text-xs text-muted-foreground">
          {d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            title="View Document"
            onClick={() => handleDownload(d.id, "view")}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            title="Download Document"
            onClick={() => handleDownload(d.id, "download")}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            title="Archive / Supersede"
            onClick={() => deleteDocMutation.mutate(d.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Centre</h1>
          <p className="text-muted-foreground mt-0.5">
            Central repository of customer transparent quotes, LOAs, utility contracts, and internal worksheets stored securely in Cloudflare R2.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 h-9 text-xs font-semibold self-start sm:self-auto shrink-0"
          onClick={() => {
            setSelectedCompanyForUpload(companies[0] || null)
            setIsUploadOpen(true)
          }}
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{totalDocs}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Customer-Visible</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{customerVisibleCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Globe className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Internal Only</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{internalCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Lock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Signed LOAs</p>
            <p className="text-2xl font-bold mt-1 text-indigo-600">{loaCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, supplier, client..."
            className="pl-8 h-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="quote">Quotes</SelectItem>
              <SelectItem value="signed_loa">Signed LOAs</SelectItem>
              <SelectItem value="unsigned_loa">Draft LOAs</SelectItem>
              <SelectItem value="contract">Contracts</SelectItem>
              <SelectItem value="bill">Bills</SelectItem>
              <SelectItem value="supplier_letter">Supplier Letters</SelectItem>
              <SelectItem value="report">Reports</SelectItem>
            </SelectContent>
          </Select>

          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visibility</SelectItem>
              <SelectItem value="visible">Customer-Visible</SelectItem>
              <SelectItem value="internal">Internal Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredDocs}
            isLoading={isLoading}
            searchable={false}
            emptyMessage="No documents match your search criteria."
          />
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        business={selectedCompanyForUpload}
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["documents"] })
        }}
      />
    </div>
  )
}
