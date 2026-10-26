"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient, type CompanyData } from "@/lib/api-client"
import { PdfPageCanvas } from "@/components/pdf-page-canvas"
import { toast } from "sonner"
import {
  ArrowLeft,
  Upload,
  FileText,
  ShieldCheck,
  Smartphone,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  PenTool,
  ZoomIn,
  ZoomOut,
  Calendar,
  Briefcase,
  Mail,
  Info,
  Send,
  Building2,
  Clock,
  Eye,
  Lock,
  Globe,
  Sliders,
  Move,
  Maximize2,
} from "lucide-react"

export interface SignatureZone {
  x: number
  y: number
  w: number
  h: number
}

export default function UploadDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const preselectedBusinessId = searchParams.get("business_id")

  // Stepper state (1: Upload & Details, 2: Signers & Roles, 3: Placement Studio, 4: Review & Dispatch)
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Step 1: File & Document Info
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState("")
  const [documentType, setDocumentType] = useState("unsigned_loa")
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(preselectedBusinessId || "")
  const [utilityType, setUtilityType] = useState("electricity")
  const [supplierName, setSupplierName] = useState("")
  const [notes, setNotes] = useState("")
  const [isCustomerVisible, setIsCustomerVisible] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Signing Roles (DocuSign Model)
  const [signerMode, setSignerMode] = useState<"customer" | "both" | "none">("customer")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [brokerSignerName, setBrokerSignerName] = useState("Price Buddy Commercial Broker")
  const [instructions, setInstructions] = useState(
    "Please review the document and sign where indicated on your Price Buddy mobile app."
  )
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split("T")[0]
  })

  // Step 3: Signature Zone & Fields (No presets - freely draggable and clickable)
  const [targetPage, setTargetPage] = useState<number>(1)
  const [detectedTotalPages, setDetectedTotalPages] = useState<number>(1)
  const [zone, setZone] = useState<SignatureZone>({ x: 0.30, y: 0.78, w: 0.40, h: 0.065 })
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const [isDragging, setIsDragging] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Required Field Toggles (Only signature is mandatory by default; other fields require explicit admin toggle)
  const [reqSignature, setReqSignature] = useState(true)
  const [reqFullName, setReqFullName] = useState(false)
  const [reqJobTitle, setReqJobTitle] = useState(false)
  const [reqEmail, setReqEmail] = useState(false)
  const [reqDate, setReqDate] = useState(false)
  const [reqTermsCheck, setReqTermsCheck] = useState(false)

  // Fetch Companies
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiClient.getCompanies(),
  })

  // Selected company object
  const selectedBusiness = companies.find(
    (c: CompanyData) => c.id === selectedBusinessId || c._id === selectedBusinessId
  )

  // Auto-fill recipient details when business changes
  useEffect(() => {
    if (selectedBusiness) {
      if (!recipientName) {
        setRecipientName(selectedBusiness.full_name || selectedBusiness.name || "")
      }
      if (!recipientEmail) {
        setRecipientEmail(selectedBusiness.email || "")
      }
    }
  }, [selectedBusiness])

  // Auto-select first business if none selected and not loading
  useEffect(() => {
    if (!selectedBusinessId && companies.length > 0) {
      setSelectedBusinessId(companies[0].id || companies[0]._id || "")
    }
  }, [companies, selectedBusinessId])

  // Handle File Pick
  const handleFilePicked = (f: File) => {
    setSelectedFile(f)
    setTargetPage(1)
    const lower = f.name.toLowerCase()
    if (!documentName) {
      const cleanName = f.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
      setDocumentName(cleanName)
    }

    if (lower.includes("contract") || lower.includes("agreement")) {
      setDocumentType("signed_contract")
      setSignerMode("customer")
      setInstructions("Please review the commercial supply schedule and sign in the designated execution box.")
    } else if (lower.includes("loa") || lower.includes("authority")) {
      setDocumentType("unsigned_loa")
      setSignerMode("customer")
      setInstructions("Please review and sign the Letter of Authority to authorise energy tenders.")
    } else if (lower.includes("bill") || lower.includes("invoice")) {
      setDocumentType("bill")
      setSignerMode("none")
    } else if (lower.includes("quote")) {
      setDocumentType("quote_comparison_pdf")
      setSignerMode("customer")
    }
  }

  // Interactive canvas click to reposition signature box
  const handleCanvasClick = useCallback(
    (coords: { x: number; y: number }) => {
      setZone((prev) => {
        const newX = Math.max(0.02, Math.min(0.98 - prev.w, coords.x - prev.w / 2))
        const newY = Math.max(0.02, Math.min(0.98 - prev.h, coords.y - prev.h / 2))
        return {
          ...prev,
          x: Number(newX.toFixed(3)),
          y: Number(newY.toFixed(3)),
        }
      })
    },
    []
  )

  // Mouse Drag on Signature Box
  const handleBoxMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    const startY = e.clientY
    const initX = zone.x
    const initY = zone.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!previewContainerRef.current) return
      const rect = previewContainerRef.current.getBoundingClientRect()
      const deltaX = (moveEvent.clientX - startX) / rect.width
      const deltaY = (moveEvent.clientY - startY) / rect.height

      const newX = Math.max(0.01, Math.min(0.99 - zone.w, initX + deltaX))
      const newY = Math.max(0.01, Math.min(0.99 - zone.h, initY + deltaY))

      setZone((prev) => ({
        ...prev,
        x: Number(newX.toFixed(3)),
        y: Number(newY.toFixed(3)),
      }))
    }

    const onMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  // Validation helpers for linear progression
  const isStep1Valid = () => {
    return Boolean(selectedFile && documentName.trim() && selectedBusinessId)
  }

  const isStep2Valid = () => {
    if (signerMode === "none") return true
    return Boolean(recipientName.trim() && recipientEmail.trim())
  }

  // Enforce step navigation rules (prevents jumping to Step 3 without completing Step 2)
  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return

    // Allow going backwards to any completed step
    if (targetStep < currentStep) {
      if (targetStep === 3 && signerMode === "none") {
        setCurrentStep(2)
      } else {
        setCurrentStep(targetStep)
      }
      return
    }

    // Attempting to advance forward: enforce validation of all prior steps
    if (targetStep >= 2) {
      if (!selectedFile) {
        toast.error("Please upload a document file in Step 1 first.")
        return
      }
      if (!documentName.trim()) {
        toast.error("Please provide a document title in Step 1.")
        return
      }
      if (!selectedBusinessId) {
        toast.error("Please select a client company in Step 1.")
        return
      }
    }

    if (targetStep >= 3) {
      if (signerMode === "none") {
        toast.info("Signature placement is skipped because 'No Signature Needed' is selected.")
        setCurrentStep(4)
        return
      }
      if (!recipientName.trim() || !recipientEmail.trim()) {
        toast.error("Please complete Signers & Roles (Step 2) with the recipient's name and email first.")
        setCurrentStep(2)
        return
      }
    }

    setCurrentStep(targetStep)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedFile) {
        toast.error("Please select a document file to proceed.")
        return
      }
      if (!documentName.trim()) {
        toast.error("Please provide a document title.")
        return
      }
      if (!selectedBusinessId) {
        toast.error("Please choose a client company.")
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (signerMode !== "none") {
        if (!recipientName.trim()) {
          toast.error("Please provide the customer signer's full name.")
          return
        }
        if (!recipientEmail.trim()) {
          toast.error("Please provide the customer signer's email address.")
          return
        }
        setCurrentStep(3)
      } else {
        // Skip placement studio directly to review
        setCurrentStep(4)
      }
    } else if (currentStep === 3) {
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    if (currentStep === 4 && signerMode === "none") {
      setCurrentStep(2)
    } else {
      setCurrentStep((prev) => Math.max(1, prev - 1))
    }
  }

  // Upload & Send Mutation
  const uploadAndSendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Please select a document file to upload.")
      if (!documentName.trim()) throw new Error("Please enter a document title.")
      if (!selectedBusiness) throw new Error("Please select a client business.")

      const userId = selectedBusiness.id || selectedBusiness._id

      // 1. Upload Document Form
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("document_name", documentName.trim())
      formData.append("document_type", documentType)
      formData.append("user_id", userId || "")
      formData.append("business_id", userId || "")
      if (utilityType && utilityType !== "none") formData.append("utility_type", utilityType)
      if (supplierName.trim()) formData.append("supplier_name", supplierName.trim())
      formData.append("status", signerMode === "none" ? "current" : "awaiting_signature")
      formData.append("is_customer_visible", String(isCustomerVisible))
      if (notes.trim()) formData.append("notes", notes.trim())

      const isLoa = documentType === "signed_loa" || documentType === "unsigned_loa"
      if (isLoa) {
        formData.append(
          "loa_metadata_json",
          JSON.stringify({
            loa_status: "active",
            authorisation_scope: [
              "Access historical consumption and half-hourly data",
              "Obtain supply numbers (MPAN/MPRN) and meter details",
              "Request supplier contract end dates and pricing tenders",
            ],
            notes: "Information gathering only. Strict customer consent required prior to contract agreement.",
          })
        )
      }

      const uploadRes = await apiClient.uploadDocument(formData)
      const docId = uploadRes?.document?.id || uploadRes?.document_id

      // 2. If Signatures Required, configure & dispatch signature request
      if (signerMode !== "none" && docId) {
        const fields: any[] = []

        if (reqFullName) {
          fields.push({
            id: "f_name",
            page: targetPage,
            type: "full_name",
            label: "Confirm full name",
            required: true,
            rect: {
              x: zone.x,
              y: Math.max(0.04, zone.y - 0.15),
              w: zone.w,
              h: 0.045,
            },
            prefill: recipientName || selectedBusiness.full_name || "",
          })
        }

        if (reqJobTitle) {
          fields.push({
            id: "f_title",
            page: targetPage,
            type: "job_title",
            label: "Enter job title",
            required: true,
            rect: {
              x: zone.x,
              y: Math.max(0.04, zone.y - 0.10),
              w: zone.w,
              h: 0.045,
            },
            prefill: "Director",
          })
        }

        if (reqEmail) {
          fields.push({
            id: "f_email",
            page: targetPage,
            type: "email",
            label: "Confirm email",
            required: true,
            rect: {
              x: zone.x,
              y: Math.max(0.04, zone.y - 0.05),
              w: zone.w,
              h: 0.045,
            },
            prefill: recipientEmail || selectedBusiness.email || "",
          })
        }

        if (reqSignature) {
          fields.push({
            id: "f_sign",
            page: targetPage,
            type: "signature",
            label: "Tap to sign",
            required: true,
            rect: zone,
          })
        }

        if (reqDate) {
          fields.push({
            id: "f_date",
            page: targetPage,
            type: "date_signed",
            label: "Date signed",
            required: true,
            rect:
              zone.y + zone.h + 0.055 <= 0.98
                ? {
                    x: zone.x,
                    y: zone.y + zone.h + 0.015,
                    w: Math.min(0.38, zone.w),
                    h: 0.045,
                  }
                : {
                    x: Math.max(0.05, zone.x - 0.36),
                    w: 0.34,
                    h: 0.045,
                  },
            readOnly: true,
          })
        }

        if (reqTermsCheck) {
          fields.push({
            id: "f_terms",
            page: 1,
            type: "acknowledgement",
            label: "I accept the tariff terms and conditions",
            required: true,
            rect: { x: 0.08, y: 0.86, w: 0.84, h: 0.045 },
          })
        }

        await apiClient.sendForSignature(docId, {
          target_page: targetPage,
          signature_zone: zone,
          fields,
          recipient_name: recipientName || selectedBusiness.company_name,
          recipient_email: recipientEmail || selectedBusiness.email,
          instructions,
          due_date: dueDate,
        })
      }

      return uploadRes
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      queryClient.invalidateQueries({ queryKey: ["company-documents"] })
      if (signerMode !== "none") {
        toast.success("Document uploaded & dispatched for signature!", {
          description: `Dispatched to ${recipientName || selectedBusiness?.company_name} for mobile app digital signing.`,
        })
      } else {
        toast.success("Document uploaded successfully to Document Centre.")
      }
      router.push("/dashboard/documents")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to upload and dispatch document")
    },
  })

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link
              href="/dashboard/documents"
              className="hover:text-foreground flex items-center gap-1 transition"
            >
              <ArrowLeft className="h-3 w-3" />
              Document Centre
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Upload &amp; Send for Signature</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            Upload &amp; Send Document
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            DocuSign-style workflow: upload your document, configure signers, and place signature fields.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/documents")}
            className="text-xs font-medium"
          >
            Cancel
          </Button>
          {currentStep === 4 ? (
            <Button
              size="sm"
              onClick={() => uploadAndSendMutation.mutate()}
              disabled={uploadAndSendMutation.isPending}
              className="gap-2 text-xs font-semibold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send className="h-3.5 w-3.5" />
              {uploadAndSendMutation.isPending
                ? "Dispatching..."
                : signerMode !== "none"
                ? "Dispatch to Customer Mobile App"
                : "Save & Upload Document"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              Continue to Step {currentStep === 2 && signerMode === "none" ? 4 : currentStep + 1}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Stepper Progress Bar (Enforces Linear Validation) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {[
          { step: 1, label: "Upload & Details", desc: "File & Metadata" },
          { step: 2, label: "Signers & Roles", desc: "Mobile / Us" },
          { step: 3, label: "Field Placement", desc: "Position Signature" },
          { step: 4, label: "Review & Send", desc: "Dispatch to App" },
        ].map((s) => {
          const isActive = currentStep === s.step
          const isDone = currentStep > s.step
          const isSkipped = s.step === 3 && signerMode === "none"

          return (
            <div
              key={s.step}
              onClick={() => handleStepClick(s.step)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? "border-primary bg-primary/5 shadow-xs"
                  : isDone
                  ? "border-muted-foreground/30 bg-card hover:border-primary/50"
                  : "border-border/60 bg-muted/20 opacity-60 hover:opacity-80"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.step}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {isSkipped ? "Not required" : s.desc}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* STEP 1: Upload File & Document Details */}
      {currentStep === 1 && (
        <div className="grid gap-6 md:grid-cols-12">
          {/* File Picker Zone */}
          <div className="md:col-span-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Select File
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload PDF contract, signed/unsigned LOA, supplier quote, or bill.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/70 hover:bg-primary/5 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="p-3.5 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition duration-200">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Drag and drop file here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports PDF, Word (DOCX), or scanned images up to 25MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border bg-muted/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-sm truncate text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "Document"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        setDocumentName("")
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                )}

                {/* Document Title */}
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-semibold">Document Title *</Label>
                  <Input
                    placeholder="e.g. Commercial Electricity Supply Agreement 2026-2029"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                {/* Category & Utility */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Document Category</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unsigned_loa">Draft LOA (Authority)</SelectItem>
                        <SelectItem value="signed_loa">Signed LOA</SelectItem>
                        <SelectItem value="signed_contract">Utility Contract</SelectItem>
                        <SelectItem value="quote_comparison_pdf">Transparent Quote</SelectItem>
                        <SelectItem value="bill">Bill / Statement</SelectItem>
                        <SelectItem value="report">Audit / Efficiency Report</SelectItem>
                        <SelectItem value="other">Other Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Utility Type</Label>
                    <Select value={utilityType} onValueChange={setUtilityType}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Utility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electricity">⚡ Electricity</SelectItem>
                        <SelectItem value="gas">🔥 Natural Gas</SelectItem>
                        <SelectItem value="water">💧 Commercial Water</SelectItem>
                        <SelectItem value="telecoms">🌐 Telecoms</SelectItem>
                        <SelectItem value="none">None / General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client & Metadata */}
          <div className="md:col-span-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Client &amp; Visibility
                </CardTitle>
                <CardDescription className="text-xs">
                  Associate this document with a client company on Price Buddy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Select Business */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Client Company *</Label>
                  {isLoadingCompanies ? (
                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                  ) : (
                    <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select Business Client" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {companies.map((c: CompanyData) => (
                          <SelectItem key={c.id || c._id} value={(c.id || c._id) || ""}>
                            <div className="flex items-center justify-between gap-4 w-full">
                              <span className="font-medium">{c.company_name || c.name}</span>
                              <span className="text-xs text-muted-foreground">{c.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Supplier Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Supplier Name (Optional)</Label>
                  <Input
                    placeholder="e.g. British Gas, SSE, TotalEnergies, E.ON"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>

                {/* Customer App Visibility Toggle */}
                <div className="p-3.5 rounded-xl border bg-muted/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-emerald-600" />
                      <Label className="text-xs font-semibold cursor-pointer">
                        Customer App Visibility
                      </Label>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      When enabled, this document appears in the customer&apos;s mobile app. Required for mobile signing.
                    </p>
                  </div>
                  <Switch
                    checked={isCustomerVisible}
                    onCheckedChange={setIsCustomerVisible}
                  />
                </div>

                {/* Internal Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Internal Notes (Staff Only)</Label>
                  <Textarea
                    placeholder="Add broker notes or reference numbers..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleNext} className="gap-2 font-semibold">
                Continue to Signers &amp; Roles
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Signers & Roles (DocuSign Model) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PenTool className="h-4 w-4 text-primary" />
                Who Needs to Sign?
              </CardTitle>
              <CardDescription className="text-xs">
                Configure signers. Choose who must review and execute this agreement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Signing Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => {
                    setSignerMode("customer")
                    setIsCustomerVisible(true)
                  }}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    signerMode === "customer"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/70 hover:border-muted-foreground/40 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    {signerMode === "customer" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold text-sm text-foreground">Customer Signs on Mobile</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Client signs on their Price Buddy mobile app. Fast digital signature &amp; audit trail.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setSignerMode("both")
                    setIsCustomerVisible(true)
                  }}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    signerMode === "both"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/70 hover:border-muted-foreground/40 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    {signerMode === "both" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold text-sm text-foreground">Both (Customer &amp; Us)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dual execution: broker counter-signs and customer executes on mobile app.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setSignerMode("none")}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    signerMode === "none"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/70 hover:border-muted-foreground/40 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                    {signerMode === "none" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold text-sm text-foreground">No Signature Needed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Standard view-only document, monthly statement, or historical contract.
                    </p>
                  </div>
                </div>
              </div>

              {/* Signer Detail Forms */}
              {signerMode !== "none" ? (
                <div className="space-y-4 pt-3 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Customer Signer Name *</Label>
                      <Input
                        placeholder="Full name of authorised signatory"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Customer Signer Email *</Label>
                      <Input
                        type="email"
                        placeholder="Signatory email address"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  {signerMode === "both" && (
                    <div className="p-3.5 rounded-xl border bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-indigo-600" />
                        <p className="text-xs font-semibold text-foreground">Broker / Admin Signatory</p>
                      </div>
                      <Input
                        value={brokerSignerName}
                        onChange={(e) => setBrokerSignerName(e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Signing Instructions for Customer</Label>
                      <Input
                        placeholder="e.g. Please review Schedule 1 and sign execution deed"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Signing Due Date</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border bg-muted/20 text-center py-6">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">View-Only Archive Document</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                    This document will be saved directly to the client repository without dispatching a signing task to the mobile app.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back to Upload
            </Button>
            <Button onClick={handleNext} className="gap-2 font-semibold">
              {signerMode === "none" ? "Proceed to Final Review" : "Continue to Field Placement"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Signature Field Placement Studio (Real PDF Canvas + Draggable Box) */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Tools Sidebar (DocuSign Style - No Presets) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Signer Context Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    Assigned Signer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Signatory: </span>
                    <strong className="text-foreground">{recipientName || "Customer"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="text-foreground">{recipientEmail}</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-muted-foreground">Placement: </span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      Page {targetPage} • X: {Math.round(zone.x * 100)}%, Y: {Math.round(zone.y * 100)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Signature Field Controls */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Move className="h-4 w-4 text-primary" />
                    Signature Box Position
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Drag the signature box on the document, click anywhere on the page, or use quick jumps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setZone((z) => ({ ...z, x: 0.52, y: 0.80 }))}
                      className="h-8 text-xs"
                    >
                      Bottom Right
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setZone((z) => ({ ...z, x: 0.08, y: 0.80 }))}
                      className="h-8 text-xs"
                    >
                      Bottom Left
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setZone((z) => ({ ...z, x: 0.30, y: 0.80 }))}
                      className="h-8 text-xs"
                    >
                      Bottom Center
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setZone((z) => ({ ...z, x: 0.30, y: 0.45 }))}
                      className="h-8 text-xs"
                    >
                      Middle Deed
                    </Button>
                  </div>

                  {/* Size adjustments */}
                  <div className="pt-2 border-t space-y-2">
                    <Label className="text-xs font-semibold">Signature Box Size</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        type="button"
                        variant={zone.w === 0.30 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setZone((z) => ({ ...z, w: 0.30, h: 0.055 }))}
                        className="h-7 text-xs"
                      >
                        Compact
                      </Button>
                      <Button
                        type="button"
                        variant={zone.w === 0.40 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setZone((z) => ({ ...z, w: 0.40, h: 0.065 }))}
                        className="h-7 text-xs"
                      >
                        Standard
                      </Button>
                      <Button
                        type="button"
                        variant={zone.w === 0.55 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setZone((z) => ({ ...z, w: 0.55, h: 0.075 }))}
                        className="h-7 text-xs"
                      >
                        Wide
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Form Fields Required from Signer */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Required Signer Fields
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Elements the customer must complete on the mobile app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Drawn Signature Box</span>
                    <Badge variant="secondary" className="text-[10px]">Mandatory</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Signatory Full Name</span>
                    <Switch checked={reqFullName} onCheckedChange={setReqFullName} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Job Title / Capacity</span>
                    <Switch checked={reqJobTitle} onCheckedChange={setReqJobTitle} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Signer Email</span>
                    <Switch checked={reqEmail} onCheckedChange={setReqEmail} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Timestamp (Date Signed)</span>
                    <Switch checked={reqDate} onCheckedChange={setReqDate} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Terms Acceptance Check</span>
                    <Switch checked={reqTermsCheck} onCheckedChange={setReqTermsCheck} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Canvas / Real PDF Studio */}
            <div className="lg:col-span-8 space-y-3">
              {/* Page & Zoom Navigation Bar */}
              <div className="flex items-center justify-between bg-card p-2.5 rounded-xl border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Page ({targetPage} of {detectedTotalPages}):
                  </span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        variant={targetPage === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTargetPage(p)}
                        className="h-7 w-8 text-xs p-0 font-semibold"
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.1))}
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs font-mono text-muted-foreground w-12 text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoomScale((z) => Math.min(1.4, z + 0.1))}
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setZoomScale(1.0)}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Real PDF Page Canvas with Draggable Signature Field Overlay */}
              <div className="overflow-auto border rounded-2xl bg-slate-900/5 dark:bg-slate-950/40 p-4 flex justify-center min-h-[580px] max-h-[720px]">
                <div ref={previewContainerRef}>
                  <PdfPageCanvas
                    file={selectedFile}
                    pageNumber={targetPage}
                    scale={zoomScale}
                    onLoadSuccess={({ numPages }) => {
                      setDetectedTotalPages(numPages)
                      if (targetPage > numPages) setTargetPage(1)
                    }}
                    onCanvasClick={handleCanvasClick}
                  >
                    {/* Full Name Indicator */}
                    {reqFullName && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${zone.x * 100}%`,
                          top: `${Math.max(0.04, zone.y - 0.15) * 100}%`,
                          width: `${zone.w * 100}%`,
                          height: "4.5%",
                          minHeight: "30px",
                        }}
                        className="border-2 border-dashed border-amber-500 bg-white rounded-md px-2 flex items-center justify-between text-xs text-slate-950 pointer-events-none select-none font-semibold shadow-md z-20"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <div className="p-1 rounded bg-amber-100 text-amber-800 shrink-0">
                            <UserCheck className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Full Name: <span className="text-amber-950 font-semibold">{recipientName || selectedBusiness?.full_name || selectedBusiness?.name || "Signer Name"}</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 shrink-0 ml-1.5">
                          Name
                        </span>
                      </div>
                    )}

                    {/* Job Title Indicator */}
                    {reqJobTitle && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${zone.x * 100}%`,
                          top: `${Math.max(0.04, zone.y - 0.10) * 100}%`,
                          width: `${zone.w * 100}%`,
                          height: "4.5%",
                          minHeight: "30px",
                        }}
                        className="border-2 border-dashed border-indigo-500 bg-white rounded-md px-2 flex items-center justify-between text-xs text-slate-950 pointer-events-none select-none font-semibold shadow-md z-20"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <div className="p-1 rounded bg-indigo-100 text-indigo-800 shrink-0">
                            <Briefcase className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Job Title: <span className="text-indigo-950 font-semibold">Director</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-950 border border-indigo-300 shrink-0 ml-1.5">
                          Role
                        </span>
                      </div>
                    )}

                    {/* Email Indicator */}
                    {reqEmail && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${zone.x * 100}%`,
                          top: `${Math.max(0.04, zone.y - 0.05) * 100}%`,
                          width: `${zone.w * 100}%`,
                          height: "4.5%",
                          minHeight: "30px",
                        }}
                        className="border-2 border-dashed border-emerald-500 bg-white rounded-md px-2 flex items-center justify-between text-xs text-slate-950 pointer-events-none select-none font-semibold shadow-md z-20"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <div className="p-1 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            <Mail className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Email: <span className="text-emerald-950 font-semibold">{recipientEmail || selectedBusiness?.email || "signer@email.com"}</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300 shrink-0 ml-1.5">
                          Email
                        </span>
                      </div>
                    )}

                    {/* Draggable & Clickable Signature Box */}
                    <div
                      onMouseDown={handleBoxMouseDown}
                      style={{
                        position: "absolute",
                        left: `${zone.x * 100}%`,
                        top: `${zone.y * 100}%`,
                        width: `${zone.w * 100}%`,
                        height: `${zone.h * 100}%`,
                        minHeight: "44px",
                        cursor: isDragging ? "grabbing" : "grab",
                      }}
                      className="border-2 border-blue-600 bg-white hover:bg-blue-50/50 rounded-lg flex items-center justify-between px-3 py-1.5 shadow-xl select-none transition-all hover:border-blue-700 z-30"
                      title="Drag to reposition or click anywhere on the page"
                    >
                      <div className="flex items-center gap-2 pointer-events-none truncate min-w-0">
                        <div className="p-1.5 rounded-md bg-blue-600 text-white shrink-0 shadow-sm">
                          <PenTool className="h-4 w-4" />
                        </div>
                        <div className="truncate min-w-0">
                          <p className="text-xs font-black text-blue-950 truncate leading-tight uppercase tracking-tight">
                            Sign Here (Signature Zone)
                          </p>
                          <p className="text-[11px] font-bold text-slate-700 truncate leading-tight">
                            {recipientName || "Customer Signer"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                          Mandatory
                        </span>
                        <Move className="h-4 w-4 text-blue-600 shrink-0 pointer-events-none" />
                      </div>
                    </div>

                    {/* Date Signed Indicator */}
                    {reqDate && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${zone.x * 100}%`,
                          top: `${Math.min(0.94, zone.y + zone.h + 0.015) * 100}%`,
                          width: `${Math.min(0.38, zone.w) * 100}%`,
                          height: "4.5%",
                          minHeight: "30px",
                        }}
                        className="border-2 border-dashed border-sky-500 bg-white rounded-md px-2 flex items-center justify-between text-xs text-slate-950 pointer-events-none select-none font-semibold shadow-md z-20"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <div className="p-1 rounded bg-sky-100 text-sky-800 shrink-0">
                            <Calendar className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Date: <span className="text-sky-950 font-semibold">DD/MM/YYYY</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-950 border border-sky-300 shrink-0 ml-1.5">
                          Date
                        </span>
                      </div>
                    )}
                  </PdfPageCanvas>
                </div>
              </div>

              <div className="p-2.5 rounded-xl border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  Showing the real PDF page you uploaded. Drag the signature box or click anywhere on the document to position it.
                </span>
                <span className="font-mono text-[11px] text-foreground shrink-0 font-medium">
                  {selectedFile?.name || "document.pdf"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back to Signers
            </Button>
            <Button onClick={handleNext} className="gap-2 font-semibold">
              Proceed to Final Review
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Dispatch */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Review &amp; Confirm Dispatch
              </CardTitle>
              <CardDescription className="text-xs">
                Review all document details, designated signers, and signature placements before sending.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Information Summary */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Document Information
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{documentName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      File: {selectedFile?.name || "document.pdf"} (
                      {selectedFile ? (selectedFile.size / 1024).toFixed(0) : "0"} KB)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize text-xs">
                      {documentType.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {utilityType}
                    </Badge>
                    {supplierName && (
                      <Badge variant="outline" className="text-xs">
                        {supplierName}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Signer & Dispatch Channel */}
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Signer &amp; Mobile Delivery
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedBusiness?.company_name || selectedBusiness?.name || "Client Business"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recipient: {recipientName || "Contact"} ({recipientEmail || "email"})
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Delivery Channel: </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Price Buddy Customer Mobile App (Documents &gt; Needs Signature)
                    </span>
                  </div>
                  {signerMode !== "none" && (
                    <div className="text-xs text-muted-foreground">
                      Target Signature Page: <strong>Page {targetPage}</strong> (Due {dueDate})
                    </div>
                  )}
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Ready for Dispatch</p>
                    <p className="text-xs text-muted-foreground">
                      {signerMode !== "none"
                        ? "Clicking dispatch will save the document in Cloudflare R2 and immediately notify the customer on mobile."
                        : "Clicking save will register this document in the company archive."}
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={() => uploadAndSendMutation.mutate()}
                  disabled={uploadAndSendMutation.isPending}
                  className="w-full sm:w-auto font-bold gap-2 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                  {uploadAndSendMutation.isPending
                    ? "Dispatching..."
                    : signerMode !== "none"
                    ? "Dispatch to Customer Mobile App"
                    : "Save Document to Archive"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back to Placement
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
