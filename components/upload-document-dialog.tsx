"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { Upload, FileText, ShieldCheck, AlertCircle, Info, PenTool, CheckCircle2, X } from "lucide-react"

interface UploadDocumentDialogProps {
  business: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onUploadedForSignature?: (doc: any) => void
}

export function UploadDocumentDialog({
  business,
  open,
  onOpenChange,
  onSuccess,
  onUploadedForSignature,
}: UploadDocumentDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState("")
  const [documentType, setDocumentType] = useState("quote")
  const [utilityType, setUtilityType] = useState("electricity")
  const [supplierName, setSupplierName] = useState("")
  const [status, setStatus] = useState("current")
  const [expiryDate, setExpiryDate] = useState("")
  const [isCustomerVisible, setIsCustomerVisible] = useState(true)
  const [requireSignature, setRequireSignature] = useState(false)
  const [notes, setNotes] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFilePicked = (f: File) => {
    setSelectedFile(f)
    const lower = f.name.toLowerCase()
    if (!documentName) {
      const cleanName = f.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
      setDocumentName(cleanName)
    }

    // Auto-detect document category & suggest signature
    if (lower.includes("contract") || lower.includes("agreement")) {
      setDocumentType("contract")
      setRequireSignature(true)
      setStatus("awaiting_signature")
    } else if (lower.includes("loa") || lower.includes("authority")) {
      setDocumentType("unsigned_loa")
      setRequireSignature(true)
      setStatus("awaiting_signature")
    } else if (lower.includes("bill") || lower.includes("invoice")) {
      setDocumentType("bill")
    } else if (lower.includes("quote")) {
      setDocumentType("quote")
    }
  }

  // LOA specific fields
  const [loaStatus, setLoaStatus] = useState("active")
  const [loaExpiry, setLoaExpiry] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split("T")[0]
  })

  const isLoa = documentType === "signed_loa" || documentType === "unsigned_loa"

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Please select a file to upload")
      }
      if (!documentName.trim()) {
        throw new Error("Please enter a document title")
      }

      const businessId = business?.id || business?._id
      const userId = business?.user_id || business?.createdBy || business?.owner_id || businessId

      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("document_name", documentName.trim())
      formData.append("document_type", documentType)
      formData.append("user_id", userId)
      if (businessId) formData.append("business_id", businessId)
      if (utilityType && utilityType !== "none") formData.append("utility_type", utilityType)
      if (supplierName.trim()) formData.append("supplier_name", supplierName.trim())
      formData.append("status", status)
      formData.append("is_customer_visible", String(isCustomerVisible))
      if (notes.trim()) formData.append("notes", notes.trim())

      if (isLoa) {
        if (loaExpiry) formData.append("expiry_date", loaExpiry)
        formData.append(
          "loa_metadata_json",
          JSON.stringify({
            loa_status: loaStatus,
            expiry_date: loaExpiry,
            authorisation_scope: [
              "Access historical consumption and half-hourly data",
              "Obtain supply numbers (MPAN/MPRN) and meter details",
              "Request supplier contract end dates and pricing tenders",
            ],
            notes: "Information gathering only. Strict customer consent required prior to contract agreement.",
          })
        )
      } else if (expiryDate) {
        formData.append("expiry_date", expiryDate)
      }

      return apiClient.uploadDocument(formData)
    },
    onSuccess: (res: any) => {
      toast.success("Document uploaded to Cloudflare R2 and registered successfully")
      queryClient.invalidateQueries({ queryKey: ["company-documents"] })
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      onOpenChange(false)
      const uploadedDoc = res?.document || {
        id: res?.document_id || `doc_${Date.now()}`,
        document_name: documentName.trim(),
        document_type: documentType,
        user_id: business?.user_id || business?.id,
        user_company: business?.company_name || business?.name,
        supplier_name: supplierName.trim(),
      }
      setSelectedFile(null)
      setDocumentName("")
      setNotes("")
      setSupplierName("")
      onSuccess?.()
      if (requireSignature) {
        onUploadedForSignature?.(uploadedDoc)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to upload document")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document to Document Centre
          </DialogTitle>
          <DialogDescription>
            Securely upload utility PDFs and files for <strong>{business?.company_name || business?.name || "Client"}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Dedicated Full Page Option */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs">
          <span className="text-muted-foreground">Want multi-step DocuSign signing workflow?</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-primary font-semibold text-xs"
            onClick={() => {
              onOpenChange(false)
              const bId = business?.id || business?._id
              router.push(`/dashboard/documents/upload${bId ? `?business_id=${bId}` : ""}`)
            }}
          >
            Open Full Page Studio →
          </Button>
        </div>

        <div className="space-y-4 py-2">
          {/* Custom File Picker (No generic "Choose File" confusion) */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Select Document File (PDF, DOCX, PNG) *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFilePicked(f)
              }}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30 rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <div className="p-2.5 rounded-full bg-primary/10 text-primary group-hover:scale-105 transition">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Click to browse or drop file here</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports utility contracts, LOAs, bills &amp; quotes (PDF, DOCX, PNG up to 25MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs text-foreground truncate">{selectedFile.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Attached &amp; ready
                      </span>
                      <span>•</span>
                      <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-xs px-2.5 font-medium"
                  >
                    Change File
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Remove File"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Document Title */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Document Title / Display Name *</Label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. Transparent Energy Quote - British Gas Lite 24m"
              className="h-9 text-xs"
            />
          </div>

          {/* Document Type & Utility */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Document Category *</Label>
              <Select value={documentType} onValueChange={(val) => {
                setDocumentType(val)
                if (val === "quote") setStatus("current")
                if (val === "signed_loa") setStatus("active")
                if (val === "contract") setStatus("current")
                if (val === "bill") setStatus("current")
              }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote">Quote Document</SelectItem>
                  <SelectItem value="signed_loa">Letter of Authority (LOA) - Signed</SelectItem>
                  <SelectItem value="unsigned_loa">Letter of Authority (LOA) - Draft</SelectItem>
                  <SelectItem value="contract">Utility Contract</SelectItem>
                  <SelectItem value="bill">Utility Bill / Statement</SelectItem>
                  <SelectItem value="supplier_letter">Supplier Letter / Notice</SelectItem>
                  <SelectItem value="renewal_reminder">Renewal Reminder</SelectItem>
                  <SelectItem value="report">Audit / Consumption Report</SelectItem>
                  <SelectItem value="other">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Utility Type</Label>
              <Select value={utilityType} onValueChange={setUtilityType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="all">All Utilities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supplier Name & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Supplier Name (Optional)</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. British Gas, EDF, TotalEnergies"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Document Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current / Active</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="awaiting_signature">Awaiting Signature</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* LOA Special Section */}
          {isLoa && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Letter of Authority (LOA) Compliance &amp; Expiry</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">LOA Status</Label>
                  <Select value={loaStatus} onValueChange={setLoaStatus}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                      <SelectItem value="pending_signature">Pending Signature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">LOA Expiry Date *</Label>
                  <Input
                    type="date"
                    value={loaExpiry}
                    onChange={(e) => setLoaExpiry(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5 pt-1">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  Customer protection guarantee: An LOA only allows requesting meter/billing data. Customers must always review and sign any supply contract separately.
                </span>
              </p>
            </div>
          )}

          {/* General Expiry Date (if not LOA) */}
          {!isLoa && (
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Customer Visibility Switch */}
          <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <Label className="text-xs font-semibold block">Visible to Customer in Mobile App</Label>
              <p className="text-[11px] text-muted-foreground">
                {isCustomerVisible
                  ? "Customer can view and download this PDF in their 'My Documents' screen."
                  : "Internal broker only. Strictly hidden from customer mobile app and endpoints."}
              </p>
            </div>
            <Switch
              checked={isCustomerVisible}
              onCheckedChange={setIsCustomerVisible}
            />
          </div>

          {/* Require Customer Signature Switch */}
          <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <Label className="text-xs font-semibold block text-foreground flex items-center gap-1.5">
                <PenTool className="h-3.5 w-3.5 text-primary" />
                Configure Signature &amp; Send to Mobile App
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {requireSignature
                  ? "Prompt to pick target page & signature zone on this document right after upload."
                  : "Upload without configuring customer digital signature."}
              </p>
            </div>
            <Switch
              checked={requireSignature}
              onCheckedChange={setRequireSignature}
            />
          </div>

          {/* Internal Notes */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Internal Notes (Broker/Admin Only)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes (never shown to customer), e.g. supplier commission or negotiation history..."
              className="min-h-[70px] text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending || !selectedFile || !documentName.trim()}
          >
            {uploadMutation.isPending ? "Uploading to Cloudflare R2..." : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
