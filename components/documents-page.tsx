"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
  PenTool,
  Plus,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Smartphone,
  ExternalLink,
  RotateCcw,
  Archive,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { apiClient, type DocumentData } from "@/lib/api-client"
import { toast } from "sonner"
import { UploadDocumentDialog } from "./upload-document-dialog"
import { SendForSignatureDialog } from "./send-for-signature-dialog"

export function DocumentsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"all" | "needs_signature" | "completed" | "visible" | "internal" | "archived">("all")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedCompanyForUpload, setSelectedCompanyForUpload] = useState<any>(null)
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false)
  const [selectedDocForSign, setSelectedDocForSign] = useState<DocumentData | null>(null)

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
    mutationFn: ({ docId, permanent }: { docId: string; permanent?: boolean }) =>
      apiClient.deleteDocument(docId, permanent),
    onSuccess: (_, vars) => {
      toast.success(vars.permanent ? "Document permanently deleted" : "Document moved to archive / superseded")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to process document")
    },
  })

  const restoreDocMutation = useMutation({
    mutationFn: (docId: string) => apiClient.restoreDocument(docId),
    onSuccess: () => {
      toast.success("Document restored to active status")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to restore document")
    },
  })

  const handleDownload = async (
    docId: string,
    action: "view" | "download" = "view",
    target?: "signed" | "audit" | "combined" | "original"
  ) => {
    try {
      const res = await apiClient.getDocumentDownloadUrl(docId, action, target)
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
      case "quote_comparison_pdf":
      case "supplier_quote_pdf":
        return "Transparent Quote"
      case "signed_loa":
        return "Signed LOA"
      case "unsigned_loa":
        return "Draft LOA"
      case "contract":
      case "signed_contract":
        return "Utility Contract"
      case "bill":
        return "Bill / Statement"
      case "supplier_letter":
      case "supplier_confirmation":
        return "Supplier Letter"
      case "renewal_reminder":
        return "Renewal Notice"
      case "report":
        return "Audit Report"
      default:
        return "Document"
    }
  }

  const isDocNeedingSignature = (d: DocumentData) => {
    return (
      d.status === "awaiting_signature" ||
      d.document_type === "unsigned_loa" ||
      (d.status !== "signed" && d.document_type === "signed_contract")
    )
  }

  const isDocCompleted = (d: DocumentData) => {
    return (d.status === "signed" || d.status === "completed" || d.document_type === "signed_loa") && !isDocArchived(d)
  }

  const isDocArchived = (d: DocumentData) => {
    return d.status === "superseded" || d.status === "archived"
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
      typeFilter === "all" ? true : (d.document_type || "").toLowerCase().includes(typeFilter.toLowerCase())

    const isArchived = isDocArchived(d)

    const matchesTab =
      activeTab === "all"
        ? !isArchived
        : activeTab === "needs_signature"
          ? isDocNeedingSignature(d) && !isArchived
          : activeTab === "completed"
            ? isDocCompleted(d) && !isArchived
            : activeTab === "visible"
              ? d.is_customer_visible === true && !isArchived
              : activeTab === "internal"
                ? d.is_customer_visible === false && !isArchived
                : isArchived

    return matchesSearch && matchesType && matchesTab
  })

  // KPI Metrics (Active vs Archived)
  const activeDocs = documents.filter((d: DocumentData) => !isDocArchived(d))
  const totalActiveDocs = activeDocs.length
  const needsSignatureCount = activeDocs.filter(isDocNeedingSignature).length
  const completedCount = activeDocs.filter(isDocCompleted).length
  const customerVisibleCount = activeDocs.filter((d: DocumentData) => d.is_customer_visible).length
  const internalCount = totalActiveDocs - customerVisibleCount
  const archivedCount = documents.filter(isDocArchived).length

  const columns: DataTableColumn<DocumentData>[] = [
    {
      key: "document_name",
      label: "Document",
      sortable: true,
      className: "py-4 px-4 align-middle min-w-[280px] max-w-[340px]",
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p
              onClick={() => handleDownload(d.id, "view")}
              className="font-semibold text-sm text-foreground hover:text-primary transition cursor-pointer truncate"
              title={d.document_name}
            >
              {d.document_name}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
              {d.supplier_name && <span>{d.supplier_name} •</span>}
              <span>{d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(0)} KB` : "PDF"}</span>
              <span>•</span>
              <span>{d.created_at ? new Date(d.created_at).toLocaleDateString() : ""}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "user_company",
      label: "Client / Recipient",
      sortable: true,
      className: "py-4 px-4 align-middle min-w-[200px]",
      render: (d) => (
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {d.user_company || "Business Client"}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {d.user_email || d.user_full_name || "Assigned Contact"}
          </p>
        </div>
      ),
    },
    {
      key: "document_type",
      label: "Category",
      sortable: true,
      className: "py-4 px-4 align-middle min-w-[150px]",
      render: (d) => {
        const isLoa = d.document_type?.includes("loa")
        const isContract = d.document_type?.includes("contract")
        const isQuote = d.document_type?.includes("quote")
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge
              variant="outline"
              className={`text-xs font-medium ${isLoa
                  ? "border-purple-300 text-purple-700 bg-purple-50/50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/20"
                  : isContract
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50/50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/20"
                    : isQuote
                      ? "border-amber-300 text-amber-700 bg-amber-50/50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/20"
                      : ""
                }`}
            >
              {formatDocType(d.document_type)}
            </Badge>
            {d.utility_type && d.utility_type !== "none" && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 capitalize">
                <Zap className="h-3 w-3 text-primary" />
                {d.utility_type}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "status",
      label: "Signing Status",
      sortable: true,
      className: "py-4 px-4 align-middle min-w-[160px]",
      render: (d) => {
        if (isDocNeedingSignature(d)) {
          return (
            <Badge
              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1.5 font-semibold text-xs py-1 px-2.5 shadow-none"
            >
              <PenTool className="h-3 w-3" />
              Needs Signature
            </Badge>
          )
        }
        if (isDocCompleted(d)) {
          return (
            <Badge
              className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1.5 font-semibold text-xs py-1 px-2.5 shadow-none"
            >
              <ShieldCheck className="h-3 w-3" />
              Signed &amp; Complete
            </Badge>
          )
        }
        return (
          <Badge variant="outline" className="text-xs py-1 px-2.5 font-medium capitalize">
            {d.status || "Current"}
          </Badge>
        )
      },
    },
    {
      key: "is_customer_visible",
      label: "Visibility",
      sortable: true,
      className: "py-4 px-4 align-middle min-w-[140px]",
      render: (d) => (
        <button
          type="button"
          onClick={() => toggleVisibilityMutation.mutate({ docId: d.id, isVisible: !d.is_customer_visible })}
          title={d.is_customer_visible ? "Visible in customer mobile app (click to make internal only)" : "Internal only (click to make visible in customer app)"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${d.is_customer_visible
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
              : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
            }`}
        >
          {d.is_customer_visible ? (
            <>
              <Globe className="h-3.5 w-3.5" />
              Customer App
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" />
              Internal Only
            </>
          )}
        </button>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "py-4 px-4 align-middle text-right min-w-[170px]",
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          {/* Primary Action Button */}
          {isDocNeedingSignature(d) ? (
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => router.push(`/dashboard/documents/${d.id}/prepare`)}
              title="Designate signature placement and dispatch to customer mobile app"
            >
              <PenTool className="h-3.5 w-3.5" />
              Sign Setup
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-medium gap-1.5"
              onClick={() => handleDownload(d.id, "view")}
              title="View document in new tab"
            >
              <Eye className="h-3.5 w-3.5" />
              {isDocCompleted(d) ? "View" : "View"}
            </Button>
          )}

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleDownload(d.id, "view")}>
                <Eye className="h-4 w-4 mr-2" /> {isDocCompleted(d) ? "View Signed PDF" : "View Document"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload(d.id, "download")}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </DropdownMenuItem>

              {/* Only show Signature Studio if the document has NOT been completed or archived */}
              {!isDocCompleted(d) && !isDocArchived(d) ? (
                <DropdownMenuItem onClick={() => router.push(`/dashboard/documents/${d.id}/prepare`)}>
                  <PenTool className="h-4 w-4 mr-2" /> Signature Studio
                </DropdownMenuItem>
              ) : isDocCompleted(d) ? (
                <>
                  <DropdownMenuItem onClick={() => handleDownload(d.id, "download", "combined")}>
                    <FileText className="h-4 w-4 mr-2 text-primary" /> Download Combined Pack
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(d.id, "download", "audit")}>
                    <ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" /> Download Audit Certificate
                  </DropdownMenuItem>
                </>
              ) : null}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  toggleVisibilityMutation.mutate({ docId: d.id, isVisible: !d.is_customer_visible })
                }
              >
                <Globe className="h-4 w-4 mr-2" />
                {d.is_customer_visible ? "Make Internal Only" : "Make Visible to Customer"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isDocArchived(d) ? (
                <>
                  <DropdownMenuItem onClick={() => restoreDocMutation.mutate(d.id)}>
                    <RotateCcw className="h-4 w-4 mr-2 text-emerald-600" /> Restore to Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteDocMutation.mutate({ docId: d.id, permanent: true })}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Permanently Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteDocMutation.mutate({ docId: d.id, permanent: false })}
                >
                  <Archive className="h-4 w-4 mr-2" /> Archive Document
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Document Centre
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-3xl">
            DocuSign-style contract &amp; LOA management. Upload agreements, configure signers, and enable customers to review and execute directly on the Price Buddy mobile app.
          </p>
        </div>

        {/* Primary CTA - Dedicated Page Navigation */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <Button
            asChild
            size="default"
            className="gap-2 h-10 px-4 text-xs font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/dashboard/documents/upload">
              <Plus className="h-4 w-4" />
              Upload &amp; Send Document
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="p-4 flex items-center justify-between border-border/80 shadow-xs">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{totalDocs}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-amber-200/60 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Needs Signature</p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{needsSignatureCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <PenTool className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-emerald-200/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Signed &amp; Complete</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{completedCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-border/80 shadow-xs">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Customer-Visible</p>
            <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{customerVisibleCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Globe className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs Bar (DocuSign Model) */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Active Documents", count: totalActiveDocs },
            { id: "needs_signature", label: "Needs Signature", count: needsSignatureCount },
            { id: "completed", label: "Completed", count: completedCount },
            { id: "visible", label: "Customer-Visible", count: customerVisibleCount },
            { id: "internal", label: "Internal Only", count: internalCount },
            { id: "archived", label: "Archived / Superseded", count: archivedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background/80 text-muted-foreground"
                  }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Category Select */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, client, email..."
              className="pl-8 h-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="loa">LOAs (Authority)</SelectItem>
              <SelectItem value="contract">Contracts</SelectItem>
              <SelectItem value="quote">Quotes</SelectItem>
              <SelectItem value="bill">Bills</SelectItem>
              <SelectItem value="report">Reports</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Spacious, Uncrowded Documents Table */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredDocs}
            isLoading={isLoading}
            searchable={false}
            pageSize={15}
            emptyMessage="No documents found matching your filter criteria."
          />
        </CardContent>
      </Card>

      {/* Keep Dialogs for any inline fallbacks or backward compatibility */}
      <UploadDocumentDialog
        business={selectedCompanyForUpload}
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["documents"] })
        }}
        onUploadedForSignature={(doc) => {
          setSelectedDocForSign(doc)
          setIsSignDialogOpen(true)
        }}
      />

      <SendForSignatureDialog
        document={selectedDocForSign}
        open={isSignDialogOpen}
        onOpenChange={setIsSignDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["documents"] })
        }}
      />
    </div>
  )
}
