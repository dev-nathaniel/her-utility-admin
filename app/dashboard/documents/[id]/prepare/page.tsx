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

  // Initialize once per document
  useEffect(() => {
    if (!document || isInitializedRef.current) return
    isInitializedRef.current = true

    const isContract =
      document.document_type?.includes("contract") ||
      document.document_name?.toLowerCase().includes("contract")

    setTargetPage(isContract ? 2 : 1)
    setZone(
      isContract
        ? { x: 0.30, y: 0.45, w: 0.45, h: 0.065 }
        : { x: 0.30, y: 0.78, w: 0.40, h: 0.065 }
    )
    setRecipientName(document.user_full_name || "")
    setRecipientEmail(document.user_email || "")
    setInstructions(
      isContract
        ? "Please review the commercial supply schedule and sign in the designated execution deed on Page 2."
        : "Please review and sign the Letter of Authority to authorise energy tenders."
    )

    const d = new Date()
    d.setDate(d.getDate() + 7)
    setDueDate(d.toISOString().split("T")[0])

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
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
            className="gap-2 text-xs font-semibold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="h-3.5 w-3.5" />
            {sendMutation.isPending ? "Dispatching..." : "Dispatch to Customer Mobile App"}
          </Button>
        </div>
      </div>

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
                onLoadSuccess={({ numPages }) => {
                  setDetectedTotalPages(numPages)
                  if (targetPage > numPages) setTargetPage(1)
                }}
                onCanvasClick={handleCanvasClick}
              >
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
                        Sign Here
                      </p>
                      <p className="text-[9px] text-primary-800 dark:text-primary-200 truncate leading-tight">
                        {recipientName || "Customer"}
                      </p>
                    </div>
                  </div>
                  <Move className="h-3.5 w-3.5 text-primary opacity-70 shrink-0 pointer-events-none ml-1" />
                </div>
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
