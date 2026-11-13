"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import {
  MapPin,
  Mail,
  Zap,
  Building2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Upload,
  Eye,
  Download,
  ShieldCheck,
  Lock,
  Globe,
  Trash2,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient, type DocumentData } from "@/lib/api-client"
import { toast } from "sonner"
import { UploadDocumentDialog } from "./upload-document-dialog"

interface BusinessDetailsDialogProps {
  business: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BusinessDetailsDialog({ business, open, onOpenChange }: BusinessDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [newNote, setNewNote] = useState("")
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false)

  // Add Site dialog state
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false)
  const [siteName, setSiteName] = useState("")
  const [siteAddress, setSiteAddress] = useState("")
  const [sitePostcode, setSitePostcode] = useState("")
  const [siteBusinessId, setSiteBusinessId] = useState("")

  // Add Business dialog state
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false)
  const [bizCompanyName, setBizCompanyName] = useState("")
  const [bizType, setBizType] = useState("limited_company")
  const [bizCompanyNumber, setBizCompanyNumber] = useState("")
  const [bizTradingName, setBizTradingName] = useState("")
  const [bizPostcode, setBizPostcode] = useState("")

  const businessId = business?.id || business?._id

  const { data: detail, isLoading } = useQuery({
    queryKey: ["company-detail", businessId],
    queryFn: () => apiClient.getCompany(businessId),
    enabled: !!businessId && open,
  })

  // Fetch company documents from Document Centre
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ["company-documents", businessId],
    queryFn: () => apiClient.getDocuments({ business_id: businessId }),
    enabled: !!businessId && open,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => apiClient.updateCompanyStatus(businessId, newStatus),
    onSuccess: () => {
      toast.success("Pipeline status updated")
      queryClient.invalidateQueries({ queryKey: ["company-detail", businessId] })
      queryClient.invalidateQueries({ queryKey: ["companies"] })
      queryClient.invalidateQueries({ queryKey: ["recent-customers"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update status")
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: () => apiClient.addCompanyNote(businessId, newNote),
    onSuccess: () => {
      toast.success("Note added")
      setNewNote("")
      queryClient.invalidateQueries({ queryKey: ["company-detail", businessId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to add note")
    },
  })

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ docId, isVisible }: { docId: string; isVisible: boolean }) =>
      apiClient.updateDocument(docId, { is_customer_visible: isVisible }),
    onSuccess: () => {
      toast.success("Document customer visibility updated")
      queryClient.invalidateQueries({ queryKey: ["company-documents", businessId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update visibility")
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => apiClient.deleteDocument(docId),
    onSuccess: () => {
      toast.success("Document marked superseded / archived")
      queryClient.invalidateQueries({ queryKey: ["company-documents", businessId] })
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

  const addSiteMutation = useMutation({
    mutationFn: () =>
      apiClient.addCompanyProperty(businessId, {
        property_name: siteName.trim() || undefined,
        address: siteAddress.trim(),
        postcode: sitePostcode.trim(),
        business_id: siteBusinessId || undefined,
      }),
    onSuccess: () => {
      toast.success("Site added successfully")
      setIsAddSiteOpen(false)
      setSiteName("")
      setSiteAddress("")
      setSitePostcode("")
      setSiteBusinessId("")
      queryClient.invalidateQueries({ queryKey: ["company-detail", businessId] })
      queryClient.invalidateQueries({ queryKey: ["companies"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to add site")
    },
  })

  const addBusinessMutation = useMutation({
    mutationFn: () =>
      apiClient.addCompanyBusiness(businessId, {
        company_name: bizCompanyName.trim(),
        business_type: bizType || "limited_company",
        company_number: bizCompanyNumber.trim() || undefined,
        trading_name: bizTradingName.trim() || undefined,
        postcode: bizPostcode.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Business entity added successfully")
      setIsAddBusinessOpen(false)
      setBizCompanyName("")
      setBizType("limited_company")
      setBizCompanyNumber("")
      setBizTradingName("")
      setBizPostcode("")
      queryClient.invalidateQueries({ queryKey: ["company-detail", businessId] })
      queryClient.invalidateQueries({ queryKey: ["companies"] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to add business entity")
    },
  })

  if (!business) return null

  const comp = detail?.company || business
  const properties = detail?.properties || []
  const contracts = detail?.contracts || []
  const notes = detail?.notes || []
  const businesses = detail?.businesses || business?.businesses || []
  const currentStatus = comp.pipeline_status || "new_lead"

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                    {(comp.company_name || comp.name || "C").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl font-bold">{comp.company_name || comp.name}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-0.5">
                    <span>{comp.email}</span>
                    {comp.full_name && <span>&bull; {comp.full_name}</span>}
                  </DialogDescription>
                </div>
              </div>

              {/* Quick Actions & Pipeline Status */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-medium"
                  onClick={() => setIsAddSiteOpen(true)}
                >
                  <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>+ Add Site</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-medium"
                  onClick={() => setIsAddBusinessOpen(true)}
                >
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>+ Add Business</span>
                </Button>
                <div className="flex items-center gap-1.5 pl-1.5 border-l">
                  <span className="text-xs text-muted-foreground font-medium">Pipeline:</span>
                  <Select
                    value={currentStatus}
                    onValueChange={(val) => updateStatusMutation.mutate(val)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_lead">New Lead</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="quote_sent">Quote Sent</SelectItem>
                      <SelectItem value="customer">Active Customer</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading company records...</div>
          ) : (
            <Tabs defaultValue="sites" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="sites">Sites ({properties.length})</TabsTrigger>
                <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
                {/* Document Centre commented out
                <TabsTrigger value="documents" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Documents ({documents.length})</span>
                </TabsTrigger>
                */}
                <TabsTrigger value="notes">Notes &amp; Activity</TabsTrigger>
                <TabsTrigger value="details">Company Info</TabsTrigger>
              </TabsList>

              {/* Tab: Sites */}
              <TabsContent value="sites" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Registered Sites &amp; Supply Locations</h3>
                    <p className="text-xs text-muted-foreground">
                      Physical customer sites where meters and utility contracts are linked.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 h-8 text-xs font-medium"
                    onClick={() => setIsAddSiteOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Site
                  </Button>
                </div>

                {properties.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground border rounded-lg border-dashed space-y-3">
                    <p>No sites or properties registered for this customer yet.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs font-medium"
                      onClick={() => setIsAddSiteOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add First Site
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {properties.map((p: any) => (
                      <Card key={p.id || p._id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{p.property_name || "Primary Site"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.address}</p>
                            <p className="text-xs font-mono font-medium text-foreground mt-1">
                              {p.postcode}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Contracts */}
              <TabsContent value="contracts" className="space-y-4 mt-4">
                {contracts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No utility contracts attached yet.</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utility</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Tariff Rates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.map((c: any) => (
                          <TableRow key={c.id || c._id}>
                            <TableCell className="font-medium capitalize flex items-center gap-2">
                              <Zap className="h-4 w-4 text-muted-foreground" />
                              {c.utility_type}
                            </TableCell>
                            <TableCell>{c.supplier_name || "—"}</TableCell>
                            <TableCell>
                              {c.end_date || c.contract_end_date ? new Date(c.end_date || c.contract_end_date).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={c.urgency_level === "critical" ? "destructive" : "secondary"}
                                className="capitalize text-xs"
                              >
                                {c.urgency_level || "Normal"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {c.unit_rate ? `${c.unit_rate} p/kWh` : "—"} / {c.standing_charge ? `${c.standing_charge} p/day` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Documents (Document Centre) commented out
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Document Centre</h3>
                    <p className="text-xs text-muted-foreground">
                      Manage customer-facing and internal utility documents stored in Cloudflare R2.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 h-8 text-xs font-medium"
                    onClick={() => setIsUploadDocOpen(true)}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Document
                  </Button>
                </div>

                {isLoadingDocs ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                    No documents uploaded for this business yet. Click &quot;Upload Document&quot; above to attach transparent quote PDFs, signed LOAs, contracts, or bills.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Visibility</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((d: DocumentData) => (
                          <TableRow key={d.id || (d as any)._id}>
                            <TableCell className="max-w-[220px]">
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-foreground truncate">{d.document_name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {d.utility_type ? <span className="capitalize">{d.utility_type} &bull; </span> : ""}
                                    {d.supplier_name || ""}
                                    {d.expiry_date ? ` &bull; Exp: ${new Date(d.expiry_date).toLocaleDateString()}` : ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className="text-[11px] font-medium">
                                {formatDocType(d.document_type)}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              {d.is_customer_visible ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleVisibilityMutation.mutate({ docId: d.id, isVisible: false })
                                  }
                                  title="Click to hide from customer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:opacity-80 transition"
                                >
                                  <Globe className="h-3 w-3" />
                                  Customer-Visible
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleVisibilityMutation.mutate({ docId: d.id, isVisible: true })
                                  }
                                  title="Click to make visible to customer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground hover:opacity-80 transition"
                                >
                                  <Lock className="h-3 w-3" />
                                  Internal Only
                                </button>
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  d.status === "active" || d.status === "current"
                                    ? "secondary"
                                    : d.status === "expired"
                                    ? "destructive"
                                    : "outline"
                                }
                                className="text-[10px] capitalize font-medium"
                              >
                                {d.status || "Current"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-[11px] text-muted-foreground">
                              {d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  title="View Document"
                                  onClick={() => handleDownload(d.id, "view")}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  title="Download Document"
                                  onClick={() => handleDownload(d.id, "download")}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                  title="Archive / Mark Superseded"
                                  onClick={() => deleteDocMutation.mutate(d.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              */}

              {/* Tab: Notes */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a broker note about this client or negotiation..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                  >
                    {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</p>
                  {notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4">No notes recorded yet.</p>
                  ) : (
                    notes.map((n: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                        <p className="text-xs text-foreground">{n.body || n.note}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Tab: Info */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Registered Business Entities ({businesses.length})
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs font-medium"
                      onClick={() => setIsAddBusinessOpen(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Add Business Entity
                    </Button>
                  </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {businesses.map((b: any) => (
                        <div key={b.id || b._id} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{b.company_name}</span>
                            {b.is_primary ? (
                              <Badge className="text-[10px] py-0">Primary</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 border-primary/40 text-primary">Secondary</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize mt-1">
                            {b.business_type?.replace(/_/g, " ") || "Limited Company"}
                          </p>
                          {b.company_number && (
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              CH: {b.company_number}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Company Name</span>
                    <span className="font-semibold">{comp.company_name || comp.name || "—"}</span>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <span className="font-semibold">{comp.email || "—"}</span>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Business Type</span>
                    <span className="font-semibold capitalize">{comp.business_type || "Limited Company"}</span>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Company Number</span>
                    <span className="font-semibold">{comp.company_number || "—"}</span>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Assigned Broker</span>
                    <span className="font-semibold">{comp.assigned_broker_name || "Unassigned"}</span>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <span className="text-xs text-muted-foreground block">Joined Date</span>
                    <span className="font-semibold">
                      {comp.created_at ? new Date(comp.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <UploadDocumentDialog
        business={comp}
        open={isUploadDocOpen}
        onOpenChange={setIsUploadDocOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["company-documents", businessId] })
        }}
      />

      {/* Add Site Modal Dialog */}
      <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Add Site for {comp.company_name || comp.name}</span>
            </DialogTitle>
            <DialogDescription>
              Register a physical property or branch to manage utility meters and supply contracts.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!siteAddress.trim() || !sitePostcode.trim()) {
                toast.error("Address and Postcode are required")
                return
              }
              addSiteMutation.mutate()
            }}
            className="space-y-3.5 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="site-name">Site / Location Name (Optional)</Label>
              <Input
                id="site-name"
                placeholder="e.g. Head Office, Warehouse 2, High St Shop"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-address">Supply Address <span className="text-destructive">*</span></Label>
              <Input
                id="site-address"
                placeholder="e.g. 14 High Street, Manchester"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-postcode">Postcode <span className="text-destructive">*</span></Label>
              <Input
                id="site-postcode"
                placeholder="e.g. M1 4BT"
                value={sitePostcode}
                onChange={(e) => setSitePostcode(e.target.value.toUpperCase())}
                required
                className="font-mono uppercase"
              />
            </div>

            {businesses.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="site-biz">Associate with Business Entity</Label>
                <Select value={siteBusinessId} onValueChange={setSiteBusinessId}>
                  <SelectTrigger id="site-biz">
                    <SelectValue placeholder="Select business entity (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((b: any) => (
                      <SelectItem key={b.id || b._id} value={b.id || b._id}>
                        {b.company_name} {b.is_primary ? "(Primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSiteOpen(false)}
                disabled={addSiteMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addSiteMutation.isPending}>
                {addSiteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Site
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Business Entity Modal Dialog */}
      <Dialog open={isAddBusinessOpen} onOpenChange={setIsAddBusinessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Add Business for {comp.company_name || comp.name}</span>
            </DialogTitle>
            <DialogDescription>
              Register an additional company, trading entity, or subsidiary under this customer account.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!bizCompanyName.trim()) {
                toast.error("Company Name is required")
                return
              }
              addBusinessMutation.mutate()
            }}
            className="space-y-3.5 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="biz-name">Company / Business Name <span className="text-destructive">*</span></Label>
              <Input
                id="biz-name"
                placeholder="e.g. Acme Logistics Ltd"
                value={bizCompanyName}
                onChange={(e) => setBizCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-type">Business Type</Label>
              <Select value={bizType} onValueChange={setBizType}>
                <SelectTrigger id="biz-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="limited_company">Limited Company (LTD)</SelectItem>
                  <SelectItem value="sole_trader">Sole Trader</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                  <SelectItem value="charity">Charity / Not-for-Profit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biz-reg">Company Reg No.</Label>
                <Input
                  id="biz-reg"
                  placeholder="e.g. 12345678"
                  value={bizCompanyNumber}
                  onChange={(e) => setBizCompanyNumber(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-trading">Trading Name</Label>
                <Input
                  id="biz-trading"
                  placeholder="e.g. Acme Express"
                  value={bizTradingName}
                  onChange={(e) => setBizTradingName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-postcode">Registered Postcode</Label>
              <Input
                id="biz-postcode"
                placeholder="e.g. SW1A 1AA"
                value={bizPostcode}
                onChange={(e) => setBizPostcode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddBusinessOpen(false)}
                disabled={addBusinessMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addBusinessMutation.isPending}>
                {addBusinessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Business
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
