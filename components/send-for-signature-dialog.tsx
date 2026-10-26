"use client"

import { useState, useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  PenTool,
  Send,
  Eye,
  CheckCircle2,
  Move,
  Layers,
  Sparkles,
  Info,
  Calendar,
  User,
  Mail,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  FileText,
} from "lucide-react"
import {
  SIGNATURE_PRESETS,
  getDocumentPreviewPageUrl,
  getDocumentPageCount,
  identifyDocumentCategory,
  type SignatureZone,
  type SignaturePlacementPreset,
} from "@/lib/signature-config"
import { apiClient, type DocumentData } from "@/lib/api-client"

interface SendForSignatureDialogProps {
  document: DocumentData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SendForSignatureDialog({
  document,
  open,
  onOpenChange,
  onSuccess,
}: SendForSignatureDialogProps) {
  const queryClient = useQueryClient()

  // Track document category & page count
  const docCategory = identifyDocumentCategory(document || undefined)
  const totalPages = getDocumentPageCount(document || undefined)

  // Target Page state
  const [targetPage, setTargetPage] = useState<number>(1)

  // Signature Zone (normalised 0..1 coordinates)
  const [zone, setZone] = useState<SignatureZone>({ x: 0.32, y: 0.79, w: 0.61, h: 0.052 })
  const [selectedPresetId, setSelectedPresetId] = useState<string>("loa_signatory_table")

  // Zoom scale state for full-page studio (default 100%)
  const [zoomScale, setZoomScale] = useState<number>(1.0)

  // Signer Details
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [instructions, setInstructions] = useState("")
  const [dueDate, setDueDate] = useState("")

  // Required Fields (Only signature is mandatory by default; other fields require explicit toggle)
  const [reqSignature, setReqSignature] = useState(true)
  const [reqFullName, setReqFullName] = useState(false)
  const [reqJobTitle, setReqJobTitle] = useState(false)
  const [reqEmail, setReqEmail] = useState(false)
  const [reqDate, setReqDate] = useState(false)
  const [reqTermsCheck, setReqTermsCheck] = useState(false)

  // Real presigned PDF URL if available
  const [livePdfUrl, setLivePdfUrl] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"canvas" | "pdf">("canvas")

  // PREVENT FLICKER: only initialize once per document ID!
  const lastLoadedDocIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open || !document) {
      lastLoadedDocIdRef.current = null
      return
    }

    // Only run initialization if this is a newly selected document
    if (lastLoadedDocIdRef.current === document.id) {
      return
    }
    lastLoadedDocIdRef.current = document.id

    const category = identifyDocumentCategory(document)
    const isContract = category === "contract"
    const p = isContract ? 2 : 1
    setTargetPage(p)

    const initZone: SignatureZone = isContract
      ? { x: 0.32, y: 0.43, w: 0.60, h: 0.06 }
      : { x: 0.32, y: 0.79, w: 0.61, h: 0.052 }

    setZone(initZone)
    setSelectedPresetId(isContract ? "contract_execution_deed" : "loa_signatory_table")
    setRecipientName(document.user_full_name || "")
    setRecipientEmail(document.user_email || "")
    setInstructions(
      isContract
        ? "Please review the commercial supply schedule and sign in the designated execution deed on Page 2."
        : "Please review and sign the Letter of Authority to authorise energy tenders."
    )

    // 7-day default due date
    const d = new Date()
    d.setDate(d.getDate() + 7)
    setDueDate(d.toISOString().split("T")[0])
    setZoomScale(1.0)
    setViewMode("canvas")

    // Fetch live presigned URL from backend
    if (document.id) {
      apiClient.getDocumentDownloadUrl(document.id, "view")
        .then((res) => {
          if (res?.download_url) {
            setLivePdfUrl(res.download_url)
          }
        })
        .catch(() => {
          // Fall back gracefully to high-res raster
          setLivePdfUrl(null)
        })
    }
  }, [open, document])

  // Canvas click handler for interactive positioning (smooth and stable)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewContainerRef.current) return
    const rect = previewContainerRef.current.getBoundingClientRect()
    const clickX = (e.clientX - rect.left) / rect.width
    const clickY = (e.clientY - rect.top) / rect.height

    // Center zone around click coordinates
    const newX = Math.max(0.05, Math.min(0.95 - zone.w, clickX - zone.w / 2))
    const newY = Math.max(0.05, Math.min(0.95 - zone.h, clickY - zone.h / 2))

    setZone((prev) => ({
      ...prev,
      x: Number(newX.toFixed(3)),
      y: Number(newY.toFixed(3)),
    }))
    setSelectedPresetId("custom")
  }

  const applyPreset = (preset: SignaturePlacementPreset) => {
    setSelectedPresetId(preset.id)
    setTargetPage(preset.targetPage)
    setZone(preset.zone)
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!document?.id) throw new Error("Document ID missing")

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
            y: Math.max(0.05, zone.y - 0.12),
            w: zone.w,
            h: 0.038,
          },
          prefill: recipientName || document.user_full_name || "",
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
            y: Math.max(0.05, zone.y - 0.08),
            w: zone.w,
            h: 0.038,
          },
          prefill: "Managing Director",
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
            y: Math.max(0.05, zone.y - 0.04),
            w: zone.w,
            h: 0.038,
          },
          prefill: recipientEmail || document.user_email || "",
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
          rect: {
            x: zone.x,
            y: Math.min(0.92, zone.y + zone.h + 0.012),
            w: Math.min(0.35, zone.w),
            h: 0.038,
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

      return apiClient.sendForSignature(document.id, {
        target_page: targetPage,
        signature_zone: zone,
        fields,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        instructions,
        due_date: dueDate,
      })
    },
    onSuccess: () => {
      toast.success("Document dispatched to client for digital signature", {
        description: `Designated signature zone on Page ${targetPage} sent to ${
          recipientName || document?.user_company || "client"
        }.`,
      })
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to dispatch signing request")
    },
  })

  // Compute preview URL accurately from full document
  const previewUrl = getDocumentPreviewPageUrl(document || undefined, targetPage)

  if (!open || !document) return null

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col w-screen h-screen overflow-hidden select-none animate-in fade-in duration-150">
      {/* 1. Full-Screen Studio Header */}
      <header className="h-14 border-b bg-card px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Exit Signature Setup"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <PenTool className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-foreground truncate max-w-[280px] sm:max-w-[420px]">
                  {document.document_name}
                </h2>
                <Badge variant="outline" className="text-[10px] font-medium capitalize py-0 px-1.5">
                  {docCategory}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Client: <strong>{document.user_company || "Business Client"}</strong> • Designated Signer:{" "}
                <strong>{recipientName || document.user_full_name || "Authorized Director"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Center: Page Switcher & Zoom Controls */}
        <div className="hidden md:flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
          <div className="flex items-center gap-1 px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={targetPage <= 1}
              onClick={() => {
                const nextP = Math.max(1, targetPage - 1)
                setTargetPage(nextP)
                if (nextP === 1 && docCategory === "contract") {
                  setZone({ x: 0.08, y: 0.86, w: 0.84, h: 0.05 })
                }
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-semibold px-1">
              Page {targetPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={targetPage >= totalPages}
              onClick={() => {
                const nextP = Math.min(totalPages, targetPage + 1)
                setTargetPage(nextP)
                if (nextP === 2 && docCategory === "contract") {
                  setZone({ x: 0.32, y: 0.43, w: 0.60, h: 0.06 })
                }
              }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-4 w-[1px] bg-border" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoomScale((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground w-11 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoomScale((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoomScale(1.0)}
              title="Reset Zoom"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>

          {livePdfUrl && (
            <>
              <div className="h-4 w-[1px] bg-border" />
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === "canvas" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => setViewMode("canvas")}
                >
                  Placement Canvas
                </Button>
                <Button
                  variant={viewMode === "pdf" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => setViewMode("pdf")}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Full PDF
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Right Action: Send */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 font-bold shadow"
            disabled={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            <Send className="h-3.5 w-3.5" />
            {sendMutation.isPending ? "Sending..." : "Send to Client"}
          </Button>
        </div>
      </header>

      {/* 2. Full-Screen Workspace Body */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Main Center Canvas: Document Preview */}
        <main className="flex-1 bg-slate-200/60 dark:bg-slate-950 overflow-auto p-4 sm:p-8 flex items-center justify-center relative">
          {viewMode === "pdf" && livePdfUrl ? (
            <div className="w-full h-full max-w-5xl rounded-xl shadow-2xl overflow-hidden border bg-background">
              <iframe
                src={`${livePdfUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title="Full PDF Viewer"
              />
            </div>
          ) : (
            <div
              className="relative transition-transform duration-75 ease-out shadow-2xl rounded-lg overflow-hidden border bg-white dark:bg-slate-900"
              style={{
                width: `${595 * zoomScale}px`,
                height: `${842 * zoomScale}px`,
                maxWidth: "96vw",
              }}
            >
              <div
                ref={previewContainerRef}
                onClick={handleCanvasClick}
                className="relative w-full h-full cursor-crosshair group overflow-hidden"
                title="Click anywhere on the document to designate signature space"
              >
                {/* Real Document Page Raster */}
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`Document Page ${targetPage}`}
                    className="w-full h-full object-contain pointer-events-none select-none block"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <Layers className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm font-semibold">{document.document_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Page {targetPage}</p>
                  </div>
                )}

                {/* SOLID, CRISP SIGNATURE ZONE BOX (NO FLICKER / NO BLUR) */}
                <div
                  className="absolute border-2 border-indigo-600 bg-indigo-500/25 rounded flex flex-col justify-between p-1.5 shadow-xl ring-2 ring-indigo-500/40 pointer-events-none z-10"
                  style={{
                    left: `${zone.x * 100}%`,
                    top: `${zone.y * 100}%`,
                    width: `${zone.w * 100}%`,
                    height: `${zone.h * 100}%`,
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded shadow">
                    <span className="flex items-center gap-1">
                      <PenTool className="h-3 w-3" />
                      DESIGNATED SIGNATURE SPACE
                    </span>
                    <span>Page {targetPage}</span>
                  </div>
                  <div className="text-[10px] font-semibold text-indigo-950 dark:text-indigo-100 bg-white/95 dark:bg-slate-900/95 px-1.5 py-0.5 rounded text-center truncate shadow-sm">
                    Customer Signs Directly Here in Mobile App
                  </div>
                </div>

                {/* Subtle Hover helper bar */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] px-3 py-1.5 rounded-full shadow-lg pointer-events-none flex items-center gap-2">
                  <Move className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Click anywhere on the document to reposition signature box</span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Inspector Sidebar (380px) */}
        <aside className="w-[380px] border-l bg-card flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-primary" />
              Signature Placement &amp; Signer Details
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configure where the customer signs and what details are required.
            </p>
          </div>

          <div className="p-4 space-y-5 flex-1">
            {/* Page Selector (if multi-page) */}
            {totalPages > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Signing Page</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={targetPage === 1 ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-medium justify-center"
                    onClick={() => {
                      setTargetPage(1)
                      if (docCategory === "contract") {
                        setZone({ x: 0.08, y: 0.86, w: 0.84, h: 0.05 })
                        setSelectedPresetId("contract_schedule_bottom")
                      }
                    }}
                  >
                    Page 1 (Schedule)
                  </Button>
                  <Button
                    type="button"
                    variant={targetPage === 2 ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-medium justify-center"
                    onClick={() => {
                      setTargetPage(2)
                      if (docCategory === "contract") {
                        setZone({ x: 0.32, y: 0.43, w: 0.60, h: 0.06 })
                        setSelectedPresetId("contract_execution_deed")
                      }
                    }}
                  >
                    Page 2 (Execution Deed)
                  </Button>
                </div>
              </div>
            )}

            {/* Placement Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Recommended Placement Presets
              </Label>
              <div className="space-y-1.5">
                {SIGNATURE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-start gap-2.5 ${
                      selectedPresetId === preset.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-1 rounded-full shrink-0 ${
                        selectedPresetId === preset.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{preset.label}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinate Fine-Tuning */}
            <div className="p-3 rounded-xl border bg-muted/20 space-y-2.5">
              <Label className="text-xs font-semibold block">Position Fine-Tuning (%)</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground">From Left (X):</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(zone.x * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100
                      setZone({ ...zone, x: Number(Math.max(0, Math.min(0.9, v)).toFixed(3)) })
                      setSelectedPresetId("custom")
                    }}
                    className="h-7 text-xs mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">From Top (Y):</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(zone.y * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100
                      setZone({ ...zone, y: Number(Math.max(0, Math.min(0.9, v)).toFixed(3)) })
                      setSelectedPresetId("custom")
                    }}
                    className="h-7 text-xs mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Width (%):</span>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={Math.round(zone.w * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100
                      setZone({ ...zone, w: Number(Math.max(0.1, Math.min(1.0, v)).toFixed(3)) })
                      setSelectedPresetId("custom")
                    }}
                    className="h-7 text-xs mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Height (%):</span>
                  <Input
                    type="number"
                    min="3"
                    max="30"
                    value={Math.round(zone.h * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100
                      setZone({ ...zone, h: Number(Math.max(0.03, Math.min(0.3, v)).toFixed(3)) })
                      setSelectedPresetId("custom")
                    }}
                    className="h-7 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Required Signer Fields */}
            <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
              <Label className="text-xs font-semibold block">Required Fields on Customer Screen</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={reqSignature} onCheckedChange={(c) => setReqSignature(!!c)} disabled />
                  <span>Digital Signature *</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={reqFullName} onCheckedChange={(c) => setReqFullName(!!c)} />
                  <span>Full Legal Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={reqJobTitle} onCheckedChange={(c) => setReqJobTitle(!!c)} />
                  <span>Job Title / Capacity</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={reqEmail} onCheckedChange={(c) => setReqEmail(!!c)} />
                  <span>Official Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={reqDate} onCheckedChange={(c) => setReqDate(!!c)} />
                  <span>Execution Date</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={reqTermsCheck} onCheckedChange={(c) => setReqTermsCheck(!!c)} />
                  <span>Terms Checkbox</span>
                </label>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Signatory Recipient Information</Label>
              <div className="grid gap-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Signatory Full Name (e.g. Anne Baker)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Signatory Email (e.g. anne@company.co.uk)"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Signing Due Date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message &amp; Instructions to Client</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions displayed on client mobile screen..."
                className="min-h-[64px] text-xs"
              />
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 border-t bg-muted/40 flex items-center justify-between gap-3 shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 font-bold flex-1"
              disabled={sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="h-3.5 w-3.5" />
              {sendMutation.isPending ? "Dispatching..." : `Send to Client (Page ${targetPage})`}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
