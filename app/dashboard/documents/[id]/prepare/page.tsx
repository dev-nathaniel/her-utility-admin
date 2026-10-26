"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { apiClient, type DocumentData } from "@/lib/api-client"
import { PdfPageCanvas } from "@/components/pdf-page-canvas"
import { toast } from "sonner"
import {
  ArrowLeft,
  PenTool,
  Send,
  Eye,
  CheckCircle2,
  FileText,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Info,
  Smartphone,
  Move,
  Lock,
} from "lucide-react"

export interface SignatureZone {
  x: number
  y: number
  w: number
  h: number
}

export default function PrepareDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const documentId = params.id as string

  // Fetch document details
  const { data: document, isLoading: isLoadingDoc } = useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      try {
        return await apiClient.getDocument(documentId)
      } catch {
        const all = await apiClient.getDocuments()
        const found = all.find((d: DocumentData) => d.id === documentId || d._id === documentId)
        if (!found) throw new Error("Document not found")
        return found
      }
    },
    enabled: !!documentId,
  })

  // Target Page & Real Total Pages state
  const [targetPage, setTargetPage] = useState<number>(1)
  const [detectedTotalPages, setDetectedTotalPages] = useState<number>(1)
  const [zone, setZone] = useState<SignatureZone>({ x: 0.30, y: 0.78, w: 0.40, h: 0.065 })
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const [isDragging, setIsDragging] = useState(false)

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

  // Live presigned PDF URL
  const [livePdfUrl, setLivePdfUrl] = useState<string | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)

  // Initialize and prefill existing configuration once per document
  useEffect(() => {
    if (!document || isInitializedRef.current) return
    isInitializedRef.current = true

    const isContract =
      document.document_type?.includes("contract") ||
      document.document_name?.toLowerCase().includes("contract")

    const existingSr = (document as any).signing_request
    const existingZone = (document as any).signature_zone || existingSr?.signature_zone
    const existingTargetPage = (document as any).target_page || existingSr?.target_page
    const existingFields = existingSr?.fields || (document as any).fields || []

    // 1. Prefill Target Page
    if (existingTargetPage) {
      setTargetPage(existingTargetPage)
    } else {
      setTargetPage(isContract ? 2 : 1)
    }

    // 2. Prefill Signature Zone
    if (existingZone && typeof existingZone.x === "number") {
      setZone(existingZone)
    } else {
      setZone(
        isContract
          ? { x: 0.30, y: 0.45, w: 0.45, h: 0.065 }
          : { x: 0.30, y: 0.78, w: 0.40, h: 0.065 }
      )
    }

    // 3. Prefill Signer & Instructions
    setRecipientName(existingSr?.recipient_name || document.user_full_name || "")
    setRecipientEmail(existingSr?.recipient_email || document.user_email || "")
    setInstructions(
      existingSr?.instructions ||
      (isContract
        ? "Please review the commercial supply schedule and sign in the designated execution deed on Page 2."
        : "Please review and sign the Letter of Authority to authorise energy tenders.")
    )

    if (existingSr?.due_date) {
      setDueDate(existingSr.due_date)
    } else {
      const d = new Date()
      d.setDate(d.getDate() + 7)
      setDueDate(d.toISOString().split("T")[0])
    }

    // 4. Prefill Field Toggles if previously set
    if (Array.isArray(existingFields) && existingFields.length > 0) {
      setReqFullName(existingFields.some((f: any) => f.type === "full_name" || f.id === "f_name"))
      setReqJobTitle(existingFields.some((f: any) => f.type === "job_title" || f.id === "f_title"))
      setReqEmail(existingFields.some((f: any) => f.type === "email" || f.id === "f_email"))
      setReqDate(existingFields.some((f: any) => f.type === "date_signed" || f.id === "f_date"))
      setReqTermsCheck(existingFields.some((f: any) => f.type === "acknowledgement" || f.id === "f_terms"))
    }

    // Also query dedicated signing request endpoint in case signing_request is stored separately
    apiClient
      .getSigningRequest(documentId)
      .then((res) => {
        const sr = res?.signing_request
        if (sr) {
          if (sr.signature_zone && typeof sr.signature_zone.x === "number") {
            setZone(sr.signature_zone)
          }
          if (sr.target_page) setTargetPage(sr.target_page)
          if (sr.recipient_name) setRecipientName(sr.recipient_name)
          if (sr.recipient_email) setRecipientEmail(sr.recipient_email)
          if (sr.instructions) setInstructions(sr.instructions)
          if (sr.due_date) setDueDate(sr.due_date)
          if (Array.isArray(sr.fields) && sr.fields.length > 0) {
            setReqFullName(sr.fields.some((f: any) => f.type === "full_name" || f.id === "f_name"))
            setReqJobTitle(sr.fields.some((f: any) => f.type === "job_title" || f.id === "f_title"))
            setReqEmail(sr.fields.some((f: any) => f.type === "email" || f.id === "f_email"))
            setReqDate(sr.fields.some((f: any) => f.type === "date_signed" || f.id === "f_date"))
            setReqTermsCheck(sr.fields.some((f: any) => f.type === "acknowledgement" || f.id === "f_terms"))
          }
        }
      })
      .catch(() => {
        // No previously dispatched signing request found
      })

    // Fetch live presigned PDF URL for signature placement
    apiClient
      .getDocumentDownloadUrl(documentId, "prepare")
      .then((res) => {
        if (res?.download_url) setLivePdfUrl(res.download_url)
      })
      .catch(() => setLivePdfUrl(null))
  }, [document, documentId])

  // Canvas click handler
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
          rect:
            zone.y + zone.h + 0.045 <= 0.98
              ? {
                  x: zone.x,
                  y: zone.y + zone.h + 0.012,
                  w: Math.min(0.35, zone.w),
                  h: 0.038,
                }
              : {
                  x: Math.max(0.05, zone.x - 0.36),
                  y: zone.y,
                  w: 0.32,
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
      toast.success("Document dispatched to customer mobile app!", {
        description: `Signature zone on Page ${targetPage} sent to ${
          recipientName || document?.user_company || "client"
        }.`,
      })
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      queryClient.invalidateQueries({ queryKey: ["document", documentId] })
      router.push("/dashboard/documents")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to dispatch signing request")
    },
  })

  if (isLoadingDoc) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
        <span className="text-sm text-muted-foreground font-medium">Loading document studio...</span>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-base font-semibold text-foreground">Document not found</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/documents">Return to Document Centre</Link>
        </Button>
      </div>
    )
  }

  const isSigned =
    document.status === "signed" ||
    document.status === "completed" ||
    document.document_type === "signed_loa"

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
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
            <span className="text-foreground font-medium">Signature Placement Studio</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {document.document_name}
            </h1>
            <Badge variant="outline" className="text-xs capitalize font-medium">
              {document.document_type?.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Client: <strong>{document.user_company || "Business Client"}</strong> • Dispatching to Price Buddy Mobile App
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/documents")}
            className="text-xs font-medium"
          >
            {isSigned ? "Back to Documents" : "Cancel"}
          </Button>
          {!isSigned ? (
            <Button
              size="sm"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="gap-2 text-xs font-semibold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send className="h-3.5 w-3.5" />
              {sendMutation.isPending ? "Dispatching..." : "Dispatch to Customer Mobile App"}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              className="gap-2 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 cursor-not-allowed"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              Document Sealed (Signed)
            </Button>
          )}
        </div>
      </div>

      {/* Safety Notice if document is already signed */}
      {isSigned && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Document Signed & Cryptographically Sealed</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                This document was executed and sealed on {document.signature_date ? new Date(document.signature_date).toLocaleDateString("en-GB") : "record"}. Signature placement and re-dispatch are disabled for completed legal agreements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/dashboard/documents")}
              className="text-xs font-semibold"
            >
              Back to Documents
            </Button>
            {livePdfUrl && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                onClick={() => window.open(livePdfUrl, "_blank")}
              >
                <Eye className="h-3.5 w-3.5" /> View Signed Copy
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Signer Info & Field Controls (No Presets) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Signer Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                Mobile Signer Information
              </CardTitle>
              <CardDescription className="text-xs">
                The customer will receive this signing task in their Price Buddy mobile app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Signatory Full Name</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Signatory name"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Signatory Email</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Signatory email"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Signing Instructions</Label>
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Instructions displayed on mobile"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Signature Position & Sizing */}
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

          {/* Required Fields Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Required Fields
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Signature Area</span>
                <Badge variant="secondary" className="text-[10px]">Mandatory</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confirm Full Name</span>
                <Switch checked={reqFullName} onCheckedChange={setReqFullName} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confirm Job Title</span>
                <Switch checked={reqJobTitle} onCheckedChange={setReqJobTitle} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confirm Email</span>
                <Switch checked={reqEmail} onCheckedChange={setReqEmail} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Date Signed Timestamp</span>
                <Switch checked={reqDate} onCheckedChange={setReqDate} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Terms Acceptance</span>
                <Switch checked={reqTermsCheck} onCheckedChange={setReqTermsCheck} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Interactive Real PDF Studio */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between bg-card p-3 rounded-xl border">
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

            <div className="flex items-center gap-2">
              {livePdfUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(livePdfUrl, "_blank")}
                  className="h-7 text-xs gap-1"
                >
                  <Eye className="h-3 w-3" /> Original PDF
                </Button>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.1))}
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
          </div>

          {/* Interactive Document Viewport */}
          <div className="overflow-auto border rounded-2xl bg-slate-900/5 dark:bg-slate-950/40 p-4 flex justify-center min-h-[600px] max-h-[750px]">
            <div ref={previewContainerRef}>
              <PdfPageCanvas
                url={livePdfUrl}
                pageNumber={targetPage}
                scale={zoomScale}
                contentType={document.content_type}
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
                      top: `${Math.max(0.04, zone.y - 0.125) * 100}%`,
                      width: `${zone.w * 100}%`,
                      height: "3.4%",
                    }}
                    className="border border-dashed border-amber-500 bg-amber-500/15 rounded px-2 flex items-center justify-between text-[10px] text-amber-900 dark:text-amber-200 pointer-events-none select-none font-medium shadow-xs"
                  >
                    <span className="truncate">Full Name: {recipientName || document.user_full_name || "Signer Name"}</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500 text-amber-700 dark:text-amber-300 shrink-0">Name</Badge>
                  </div>
                )}

                {/* Job Title Indicator */}
                {reqJobTitle && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${zone.x * 100}%`,
                      top: `${Math.max(0.04, zone.y - 0.085) * 100}%`,
                      width: `${zone.w * 100}%`,
                      height: "3.4%",
                    }}
                    className="border border-dashed border-indigo-500 bg-indigo-500/15 rounded px-2 flex items-center justify-between text-[10px] text-indigo-900 dark:text-indigo-200 pointer-events-none select-none font-medium shadow-xs"
                  >
                    <span className="truncate">Job Title / Role: Director</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-indigo-500 text-indigo-700 dark:text-indigo-300 shrink-0">Role</Badge>
                  </div>
                )}

                {/* Email Indicator */}
                {reqEmail && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${zone.x * 100}%`,
                      top: `${Math.max(0.04, zone.y - 0.045) * 100}%`,
                      width: `${zone.w * 100}%`,
                      height: "3.4%",
                    }}
                    className="border border-dashed border-emerald-500 bg-emerald-500/15 rounded px-2 flex items-center justify-between text-[10px] text-emerald-900 dark:text-emerald-200 pointer-events-none select-none font-medium shadow-xs"
                  >
                    <span className="truncate">Email: {recipientEmail || document.user_email || "signer@email.com"}</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500 text-emerald-700 dark:text-emerald-300 shrink-0">Email</Badge>
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
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                  className="border-2 border-primary bg-primary/25 rounded-md flex items-center justify-between px-2 py-1 shadow-lg backdrop-blur-xs select-none transition-shadow hover:shadow-xl hover:border-primary/90"
                  title="Drag to reposition or click anywhere on the page"
                >
                  <div className="flex items-center gap-1.5 pointer-events-none truncate">
                    <div className="p-1 rounded bg-primary text-primary-foreground">
                      <PenTool className="h-3 w-3" />
                    </div>
                    <div className="truncate">
                      <p className="text-[11px] font-bold text-primary-950 dark:text-primary-100 truncate leading-tight">
                        Sign Here (Signature Zone)
                      </p>
                      <p className="text-[9px] text-primary-800 dark:text-primary-200 truncate leading-tight">
                        {recipientName || "Customer"}
                      </p>
                    </div>
                  </div>
                  <Move className="h-3.5 w-3.5 text-primary opacity-70 shrink-0 pointer-events-none ml-1" />
                </div>

                {/* Date Signed Indicator */}
                {reqDate && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${zone.x * 100}%`,
                      top: `${Math.min(0.94, zone.y + zone.h + 0.012) * 100}%`,
                      width: `${Math.min(0.35, zone.w) * 100}%`,
                      height: "3.4%",
                    }}
                    className="border border-dashed border-slate-500 bg-slate-500/15 rounded px-2 flex items-center justify-between text-[10px] text-slate-900 dark:text-slate-200 pointer-events-none select-none font-medium shadow-xs"
                  >
                    <span>Date: DD/MM/YYYY</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-500 text-slate-700 dark:text-slate-300 shrink-0">Timestamp</Badge>
                  </div>
                )}
              </PdfPageCanvas>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Info className="h-3.5 w-3.5 text-primary" />
            Showing the actual document PDF from Cloudflare R2. Drag the signature box or click anywhere on the document to position it.
          </p>
        </div>
      </div>
    </div>
  )
}
