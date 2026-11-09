"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient, type DocumentData } from "@/lib/api-client"
import { PdfPageCanvas, getPdfJs } from "@/components/pdf-page-canvas"
import { stampTextFieldsOnPdf } from "@/lib/pdf-stamper"
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
  UserCheck,
  Briefcase,
  Mail,
  Calendar,
  Maximize2,
  Type,
  Hand,
  MousePointer,
  Layers,
  Sliders,
  Check,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
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

  // Live presigned PDF URL
  const [livePdfUrl, setLivePdfUrl] = useState<string | null>(null)
  const isInitializedRef = useRef(false)

  // Top-Level Loaded PDF.js document for instant shared memory
  const [loadedPdfDoc, setLoadedPdfDoc] = useState<any>(null)
  const [detectedTotalPages, setDetectedTotalPages] = useState<number>(1)
  const [docDimensions, setDocDimensions] = useState({ width: 595, height: 842 })

  // DocuSign Studio Navigation & Viewport State
  const [showThumbnails, setShowThumbnails] = useState(true)
  const [currentVisiblePage, setCurrentVisiblePage] = useState<number>(1)
  const [targetPage, setTargetPage] = useState<number>(1)
  const [zoomMode, setZoomMode] = useState<"fit" | "custom">("fit")
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const [streamViewportWidth, setStreamViewportWidth] = useState<number>(850)
  const [canvasTool, setCanvasTool] = useState<"select" | "hand">("select")
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [activeDragField, setActiveDragField] = useState<string | null>(null)

  // Viewport & Pan refs
  const studioViewportRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  // Field Assignment & Coordinates State (Per-field page & zone)
  const [signaturePage, setSignaturePage] = useState<number>(1)
  const [fullNamePage, setFullNamePage] = useState<number>(1)
  const [jobTitlePage, setJobTitlePage] = useState<number>(1)
  const [emailPage, setEmailPage] = useState<number>(1)
  const [datePage, setDatePage] = useState<number>(1)

  const [zone, setZone] = useState<SignatureZone>({ x: 0.30, y: 0.78, w: 0.40, h: 0.065 })
  const [fullNameZone, setFullNameZone] = useState<SignatureZone>({ x: 0.30, y: 0.58, w: 0.40, h: 0.045 })
  const [jobTitleZone, setJobTitleZone] = useState<SignatureZone>({ x: 0.30, y: 0.64, w: 0.40, h: 0.045 })
  const [emailZone, setEmailZone] = useState<SignatureZone>({ x: 0.30, y: 0.70, w: 0.40, h: 0.045 })
  const [dateZone, setDateZone] = useState<SignatureZone>({ x: 0.30, y: 0.86, w: 0.38, h: 0.045 })

  // Custom Text Fields
  const [customTextFields, setCustomTextFields] = useState<
    Array<{ id: string; label: string; page: number; zone: SignatureZone }>
  >([])

  // Signer Details
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [instructions, setInstructions] = useState("")
  const [dueDate, setDueDate] = useState("")

  // Field Toggles
  const [reqSignature, setReqSignature] = useState(true)
  const [reqFullName, setReqFullName] = useState(false)
  const [reqJobTitle, setReqJobTitle] = useState(false)
  const [reqEmail, setReqEmail] = useState(false)
  const [reqDate, setReqDate] = useState(false)
  const [reqTermsCheck, setReqTermsCheck] = useState(false)

  // Fetch live presigned PDF URL
  useEffect(() => {
    if (!documentId) return
    apiClient
      .getDocumentDownloadUrl(documentId, "prepare")
      .then((res) => {
        if (res?.download_url) setLivePdfUrl(res.download_url)
      })
      .catch(() => setLivePdfUrl(null))
  }, [documentId])

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
    const initPage = existingTargetPage || (isContract ? 2 : 1)
    setTargetPage(initPage)
    setSignaturePage(initPage)

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

    // 4. Prefill Field Toggles, per-field pages, and custom text fields
    if (Array.isArray(existingFields) && existingFields.length > 0) {
      const fn = existingFields.find((f: any) => f.type === "full_name" || f.id === "f_name")
      if (fn) {
        setReqFullName(true)
        if (fn.page) setFullNamePage(fn.page)
        if (fn.rect?.x !== undefined) setFullNameZone(fn.rect)
      }
      const jt = existingFields.find((f: any) => f.type === "job_title" || f.id === "f_title")
      if (jt) {
        setReqJobTitle(true)
        if (jt.page) setJobTitlePage(jt.page)
        if (jt.rect?.x !== undefined) setJobTitleZone(jt.rect)
      }
      const em = existingFields.find((f: any) => f.type === "email" || f.id === "f_email")
      if (em) {
        setReqEmail(true)
        if (em.page) setEmailPage(em.page)
        if (em.rect?.x !== undefined) setEmailZone(em.rect)
      }
      const dt = existingFields.find((f: any) => f.type === "date_signed" || f.id === "f_date")
      if (dt) {
        setReqDate(true)
        if (dt.page) setDatePage(dt.page)
        if (dt.rect?.x !== undefined) setDateZone(dt.rect)
      }
      setReqTermsCheck(existingFields.some((f: any) => f.type === "acknowledgement" || f.id === "f_terms"))

      // Note: Text fields burned into the PDF are part of the document stream,
      // and do not need to show up as interactive fields in Signature Studio.
    }
  }, [document])

  // Load PDF document once via getPdfJs from livePdfUrl
  useEffect(() => {
    if (!livePdfUrl) return
    let cancelled = false
    getPdfJs()
      .then((pdfjs) => {
        if (!pdfjs || cancelled) return
        const loadingTask = pdfjs.getDocument(livePdfUrl)
        loadingTask.promise.then((pdf: any) => {
          if (cancelled) return
          setLoadedPdfDoc(pdf)
          setDetectedTotalPages(pdf.numPages)
          pdf.getPage(1).then((page: any) => {
            if (cancelled) return
            const vp = page.getViewport({ scale: 1.0 })
            setDocDimensions({ width: vp.width, height: vp.height })
          })
        })
      })
      .catch((err) => {
        console.warn("Could not pre-load PDF doc:", err)
      })
    return () => {
      cancelled = true
    }
  }, [livePdfUrl])

  // Measure studio viewport width dynamically with ResizeObserver
  useEffect(() => {
    const vp = studioViewportRef.current
    if (!vp) return
    const updateWidth = () => {
      if (vp.clientWidth > 0) {
        setStreamViewportWidth(vp.clientWidth)
      }
    }
    updateWidth()
    const ro = new ResizeObserver(updateWidth)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [])

  // Listen for Spacebar to enable temporary hand panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const target = e.target as HTMLElement
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault()
          setIsSpacePressed(true)
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Page Dimensions Calculation
  const docAspect = docDimensions.height / (docDimensions.width || 1)
  const pageWidth = useMemo(() => {
    const baseAvailable = Math.max(480, streamViewportWidth - 48)
    if (zoomMode === "fit") {
      return baseAvailable
    }
    return Math.round(baseAvailable * zoomScale)
  }, [streamViewportWidth, zoomMode, zoomScale])

  const pageHeight = useMemo(() => {
    return Math.round(pageWidth * (docAspect || 1.414))
  }, [pageWidth, docAspect])

  // Smooth scroll to target page in the document stream
  const scrollToPage = useCallback((p: number) => {
    setCurrentVisiblePage(p)
    setTargetPage(p)
    const el = document.getElementById(`doc-stream-page-${p}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  // Track visible page as user scrolls down the document stream
  const handleStreamScroll = useCallback(() => {
    const vp = studioViewportRef.current
    if (!vp) return
    const pageEls = vp.querySelectorAll("[data-page-number]")
    let mostVisiblePage = currentVisiblePage
    let minDistance = Infinity
    const vpRect = vp.getBoundingClientRect()
    const vpCenter = vpRect.top + 180

    pageEls.forEach((el) => {
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(rect.top - vpCenter)
      if (dist < minDistance) {
        minDistance = dist
        const pNum = Number(el.getAttribute("data-page-number"))
        if (!isNaN(pNum)) {
          mostVisiblePage = pNum
        }
      }
    })

    if (mostVisiblePage !== currentVisiblePage) {
      setCurrentVisiblePage(mostVisiblePage)
    }
  }, [currentVisiblePage])

  // Helper: Count fields placed on a specific page
  const getPageFieldCount = useCallback(
    (p: number) => {
      let count = 0
      if (reqSignature && signaturePage === p) count++
      if (reqFullName && fullNamePage === p) count++
      if (reqJobTitle && jobTitlePage === p) count++
      if (reqEmail && emailPage === p) count++
      if (reqDate && datePage === p) count++
      customTextFields.forEach((tf) => {
        if ((tf.page || 1) === p) count++
      })
      return count
    },
    [reqSignature, signaturePage, reqFullName, fullNamePage, reqJobTitle, jobTitlePage, reqEmail, emailPage, reqDate, datePage, customTextFields]
  )

  // Smooth mouse drag panning
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (canvasTool === "select" && !isSpacePressed) {
      const isField = (e.target as HTMLElement).closest("[data-canvas-field]")
      const isInput = (e.target as HTMLElement).tagName === "INPUT"
      if (isField || isInput) return
      const isDocSheet = (e.target as HTMLElement).closest("[data-doc-sheet]")
      if (isDocSheet) return
    }

    const vp = studioViewportRef.current
    if (!vp) return

    e.preventDefault()
    isPanningRef.current = true
    setIsPanning(true)

    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: vp.scrollLeft,
      scrollTop: vp.scrollTop,
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isPanningRef.current || !studioViewportRef.current) return
      const dx = moveEvent.clientX - panStartRef.current.x
      const dy = moveEvent.clientY - panStartRef.current.y
      studioViewportRef.current.scrollLeft = panStartRef.current.scrollLeft - dx
      studioViewportRef.current.scrollTop = panStartRef.current.scrollTop - dy
    }

    const onMouseUp = () => {
      isPanningRef.current = false
      setIsPanning(false)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  // Mouse Drag to Move Field
  const handleFieldMouseDown = (
    e: React.MouseEvent,
    fieldName: string,
    currentFieldZone: SignatureZone,
    setFieldZone: (updater: (prev: SignatureZone) => SignatureZone) => void,
    pageNum: number = 1
  ) => {
    if (canvasTool === "hand" || isSpacePressed) return
    e.stopPropagation()
    e.preventDefault()
    setActiveDragField(fieldName)

    const pageContainer =
      document.getElementById(`doc-page-sheet-${pageNum}`) || previewContainerRef.current
    if (!pageContainer) return
    const rect = pageContainer.getBoundingClientRect()

    const startX = e.clientX
    const startY = e.clientY
    const initX = currentFieldZone.x
    const initY = currentFieldZone.y

    let rafId: number | null = null
    let latestEvent: MouseEvent | null = null

    const updatePosition = () => {
      if (!latestEvent) return
      const deltaX = (latestEvent.clientX - startX) / rect.width
      const deltaY = (latestEvent.clientY - startY) / rect.height

      const newX = Math.max(0.01, Math.min(0.99 - currentFieldZone.w, initX + deltaX))
      const newY = Math.max(0.01, Math.min(0.99 - currentFieldZone.h, initY + deltaY))

      setFieldZone((prev: SignatureZone) => ({
        ...prev,
        x: Number(newX.toFixed(3)),
        y: Number(newY.toFixed(3)),
      }))
      rafId = null
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      latestEvent = moveEvent
      if (rafId === null) {
        rafId = requestAnimationFrame(updatePosition)
      }
    }

    const onMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      setActiveDragField(null)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  // Mouse Drag to Resize Field
  const handleFieldResizeMouseDown = (
    e: React.MouseEvent,
    fieldName: string,
    currentFieldZone: SignatureZone,
    setFieldZone: (updater: (prev: SignatureZone) => SignatureZone) => void,
    pageNum: number = 1,
    direction: "se" | "e" | "s" = "se"
  ) => {
    if (canvasTool === "hand" || isSpacePressed) return
    e.stopPropagation()
    e.preventDefault()
    setActiveDragField(`resize-${fieldName}`)

    const pageContainer =
      document.getElementById(`doc-page-sheet-${pageNum}`) || previewContainerRef.current
    if (!pageContainer) return
    const rect = pageContainer.getBoundingClientRect()

    const startX = e.clientX
    const startY = e.clientY
    const initW = currentFieldZone.w
    const initH = currentFieldZone.h
    const initX = currentFieldZone.x
    const initY = currentFieldZone.y

    let rafId: number | null = null
    let latestEvent: MouseEvent | null = null

    const updateResize = () => {
      if (!latestEvent) return
      const deltaX = (latestEvent.clientX - startX) / rect.width
      const deltaY = (latestEvent.clientY - startY) / rect.height

      setFieldZone((prev: SignatureZone) => {
        let newW = prev.w
        let newH = prev.h

        if (direction === "se" || direction === "e") {
          newW = Math.max(0.08, Math.min(0.99 - initX, initW + deltaX))
        }

        if (direction === "se" || direction === "s") {
          newH = Math.max(0.025, Math.min(0.99 - initY, initH + deltaY))
        }

        return {
          ...prev,
          w: Number(newW.toFixed(3)),
          h: Number(newH.toFixed(3)),
        }
      })
      rafId = null
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      latestEvent = moveEvent
      if (rafId === null) {
        rafId = requestAnimationFrame(updateResize)
      }
    }

    const onMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      setActiveDragField(null)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  // Render all fields designated for a specific page number
  const renderFieldsForPage = (pageNum: number) => {
    return (
      <>
        {/* Signature Zone */}
        {reqSignature && signaturePage === pageNum && (
          <div
            data-canvas-field="true"
            onMouseDown={(e) => handleFieldMouseDown(e, "signature", zone, setZone, pageNum)}
            style={{
              position: "absolute",
              left: `${zone.x * 100}%`,
              top: `${zone.y * 100}%`,
              width: `${zone.w * 100}%`,
              height: `${zone.h * 100}%`,
              minHeight: "42px",
              cursor: activeDragField === "signature" ? "grabbing" : "grab",
            }}
            className="border-2 border-amber-600 bg-[#fff9db] dark:bg-[#382b00] rounded-md p-2 flex items-center justify-between text-xs text-amber-950 dark:text-amber-100 font-bold shadow-xl ring-2 ring-amber-400/50 hover:bg-[#fff4be] transition-colors group select-none z-30"
            title="Drag to position Signature • Use corner/edges to resize"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="bg-[#ffcc00] text-amber-950 font-black text-[10px] px-2 py-0.5 rounded shadow-xs uppercase tracking-wider flex items-center gap-1 shrink-0 border border-amber-600/40">
                <PenTool className="h-3 w-3 text-amber-950 stroke-[2.5]" />
                <span>SIGN HERE</span>
              </div>
              <span className="truncate text-xs font-bold text-amber-950 dark:text-amber-100">
                {recipientName || "Customer"}
              </span>
            </div>
            <Move className="h-4 w-4 shrink-0 text-amber-800 dark:text-amber-300 opacity-80" />

            {/* Resize handles */}
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "signature", zone, setZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-amber-600/40 rounded-full"
              title="Drag right edge to change width"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "signature", zone, setZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-amber-600/40 rounded-full"
              title="Drag bottom edge to change height"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "signature", zone, setZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-amber-500 border-2 border-white dark:border-amber-950 rounded-xs shadow-md cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
              title="Drag corner to resize width & height"
            >
              <div className="w-1.5 h-1.5 bg-white dark:bg-amber-950 rounded-full" />
            </div>
          </div>
        )}

        {/* Full Name */}
        {reqFullName && fullNamePage === pageNum && (
          <div
            data-canvas-field="true"
            onMouseDown={(e) => handleFieldMouseDown(e, "fullName", fullNameZone, setFullNameZone, pageNum)}
            style={{
              position: "absolute",
              left: `${fullNameZone.x * 100}%`,
              top: `${fullNameZone.y * 100}%`,
              width: `${fullNameZone.w * 100}%`,
              height: `${fullNameZone.h * 100}%`,
              minHeight: "30px",
              cursor: activeDragField === "fullName" ? "grabbing" : "grab",
            }}
            className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/60 rounded-md px-2 flex items-center justify-between text-xs text-blue-950 dark:text-blue-100 font-semibold shadow-md ring-1 ring-blue-400/40 z-20 group select-none"
            title="Drag to position Full Name • Use corner/edges to resize"
          >
            <span className="truncate">Full Name: {recipientName || "Name"}</span>
            <Move className="h-3.5 w-3.5 opacity-70 shrink-0" />

            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "fullName", fullNameZone, setFullNameZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-blue-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "fullName", fullNameZone, setFullNameZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-blue-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "fullName", fullNameZone, setFullNameZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
            >
              <div className="w-1 h-1 bg-blue-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Job Title */}
        {reqJobTitle && jobTitlePage === pageNum && (
          <div
            data-canvas-field="true"
            onMouseDown={(e) => handleFieldMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone, pageNum)}
            style={{
              position: "absolute",
              left: `${jobTitleZone.x * 100}%`,
              top: `${jobTitleZone.y * 100}%`,
              width: `${jobTitleZone.w * 100}%`,
              height: `${jobTitleZone.h * 100}%`,
              minHeight: "30px",
              cursor: activeDragField === "jobTitle" ? "grabbing" : "grab",
            }}
            className="border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 rounded-md px-2 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-100 font-semibold shadow-md ring-1 ring-indigo-400/40 z-20 group select-none"
            title="Drag to position Job Title • Use corner/edges to resize"
          >
            <span className="truncate">Job Title: Director</span>
            <Move className="h-3.5 w-3.5 opacity-70 shrink-0" />

            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-indigo-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-indigo-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
            >
              <div className="w-1 h-1 bg-indigo-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Email */}
        {reqEmail && emailPage === pageNum && (
          <div
            data-canvas-field="true"
            onMouseDown={(e) => handleFieldMouseDown(e, "email", emailZone, setEmailZone, pageNum)}
            style={{
              position: "absolute",
              left: `${emailZone.x * 100}%`,
              top: `${emailZone.y * 100}%`,
              width: `${emailZone.w * 100}%`,
              height: `${emailZone.h * 100}%`,
              minHeight: "30px",
              cursor: activeDragField === "email" ? "grabbing" : "grab",
            }}
            className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 rounded-md px-2 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-100 font-semibold shadow-md ring-1 ring-emerald-400/40 z-20 group select-none"
            title="Drag to position Email • Use corner/edges to resize"
          >
            <span className="truncate">Email: {recipientEmail || "email@company.com"}</span>
            <Move className="h-3.5 w-3.5 opacity-70 shrink-0" />

            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "email", emailZone, setEmailZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-emerald-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "email", emailZone, setEmailZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-emerald-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "email", emailZone, setEmailZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
            >
              <div className="w-1 h-1 bg-emerald-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Date */}
        {reqDate && datePage === pageNum && (
          <div
            data-canvas-field="true"
            onMouseDown={(e) => handleFieldMouseDown(e, "date", dateZone, setDateZone, pageNum)}
            style={{
              position: "absolute",
              left: `${dateZone.x * 100}%`,
              top: `${dateZone.y * 100}%`,
              width: `${dateZone.w * 100}%`,
              height: `${dateZone.h * 100}%`,
              minHeight: "30px",
              cursor: activeDragField === "date" ? "grabbing" : "grab",
            }}
            className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/60 rounded-md px-2 flex items-center justify-between text-xs text-amber-950 dark:text-amber-100 font-semibold shadow-md ring-1 ring-amber-400/40 z-20 group select-none"
            title="Drag to position Date • Use corner/edges to resize"
          >
            <span className="truncate">Date Signed</span>
            <Move className="h-3.5 w-3.5 opacity-70 shrink-0" />

            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "date", dateZone, setDateZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-amber-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "date", dateZone, setDateZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-amber-500/30 rounded-full"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "date", dateZone, setDateZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
            >
              <div className="w-1 h-1 bg-amber-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Custom Text Fields */}
        {customTextFields
          .filter((tf) => (tf.page || 1) === pageNum)
          .map((tf, idx) => (
            <div
              data-canvas-field="true"
              key={tf.id}
              onMouseDown={(e) =>
                handleFieldMouseDown(
                  e,
                  `customText-${tf.id}`,
                  tf.zone,
                  (updater) => {
                    setCustomTextFields((prev) =>
                      prev.map((item) =>
                        item.id === tf.id ? { ...item, zone: updater(item.zone) } : item
                      )
                    )
                  },
                  pageNum
                )
              }
              style={{
                position: "absolute",
                left: `${tf.zone.x * 100}%`,
                top: `${tf.zone.y * 100}%`,
                width: `${tf.zone.w * 100}%`,
                height: `${tf.zone.h * 100}%`,
                minHeight: "30px",
                cursor: activeDragField === `customText-${tf.id}` ? "grabbing" : "grab",
              }}
              className="border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/60 rounded-md px-2 flex items-center justify-between text-xs text-purple-950 dark:text-purple-100 font-semibold shadow-md ring-1 ring-purple-400/40 z-20 group select-none"
              title="Drag to position Text Field • Use corner/edges to resize"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                <Type className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <input
                  type="text"
                  value={tf.label}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomTextFields((prev) =>
                      prev.map((item) => (item.id === tf.id ? { ...item, label: val } : item))
                    )
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === "Enter" || e.key === "Escape") {
                      (e.target as HTMLInputElement).blur()
                    }
                  }}
                  placeholder={`Text Field ${idx + 1}`}
                  title="Click to edit field label directly"
                  className="w-full bg-transparent border-0 p-0 text-xs font-semibold text-purple-950 dark:text-purple-100 placeholder:text-purple-400/70 focus:outline-hidden focus:ring-0 select-text cursor-text"
                />
              </div>
              <Move className="h-3.5 w-3.5 opacity-70 shrink-0 text-purple-800 dark:text-purple-300 cursor-grab" />

              <div
                onMouseDown={(e) =>
                  handleFieldResizeMouseDown(
                    e,
                    `customText-${tf.id}`,
                    tf.zone,
                    (updater) => {
                      setCustomTextFields((prev) =>
                        prev.map((item) =>
                          item.id === tf.id ? { ...item, zone: updater(item.zone) } : item
                        )
                      )
                    },
                    pageNum,
                    "e"
                  )
                }
                className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-purple-500/30 rounded-full"
              />
              <div
                onMouseDown={(e) =>
                  handleFieldResizeMouseDown(
                    e,
                    `customText-${tf.id}`,
                    tf.zone,
                    (updater) => {
                      setCustomTextFields((prev) =>
                        prev.map((item) =>
                          item.id === tf.id ? { ...item, zone: updater(item.zone) } : item
                        )
                      )
                    },
                    pageNum,
                    "s"
                  )
                }
                className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-purple-500/30 rounded-full"
              />
              <div
                onMouseDown={(e) =>
                  handleFieldResizeMouseDown(
                    e,
                    `customText-${tf.id}`,
                    tf.zone,
                    (updater) => {
                      setCustomTextFields((prev) =>
                        prev.map((item) =>
                          item.id === tf.id ? { ...item, zone: updater(item.zone) } : item
                        )
                      )
                    },
                    pageNum,
                    "se"
                  )
                }
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
              >
                <div className="w-1 h-1 bg-purple-600 rounded-full" />
              </div>
            </div>
          ))}
      </>
    )
  }

  // Send / Dispatch Mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!document?.id) throw new Error("Document ID missing")

      const fields: any[] = []

      if (reqFullName) {
        fields.push({
          id: "f_name",
          page: fullNamePage || targetPage || 1,
          type: "full_name",
          label: "Confirm full name",
          required: true,
          rect: fullNameZone,
          prefill: recipientName || document.user_full_name || "",
        })
      }

      if (reqJobTitle) {
        fields.push({
          id: "f_title",
          page: jobTitlePage || targetPage || 1,
          type: "job_title",
          label: "Enter job title",
          required: true,
          rect: jobTitleZone,
          prefill: "Director",
        })
      }

      if (reqEmail) {
        fields.push({
          id: "f_email",
          page: emailPage || targetPage || 1,
          type: "email",
          label: "Confirm email",
          required: true,
          rect: emailZone,
          prefill: recipientEmail || document.user_email || "",
        })
      }

      if (reqSignature) {
        fields.push({
          id: "f_sign",
          page: signaturePage || targetPage || 1,
          type: "signature",
          label: "Tap to sign",
          required: true,
          rect: zone,
        })
      }

      if (reqDate) {
        fields.push({
          id: "f_date",
          page: datePage || targetPage || 1,
          type: "date_signed",
          label: "Date signed",
          required: true,
          rect: dateZone,
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

      customTextFields.forEach((tf, idx) => {
        const textVal = tf.label.trim()
        fields.push({
          id: `f_text_${tf.id || idx + 1}`,
          page: tf.page || targetPage || 1,
          type: "text",
          label: textVal || `Text Field ${idx + 1}`,
          value: textVal,
          prefill: textVal,
          text: textVal,
          required: false,
          rect: tf.zone,
        })
      })

      return apiClient.sendForSignature(document.id, {
        target_page: signaturePage || targetPage || 1,
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
        description: `Signature zone on Page ${signaturePage || targetPage} sent to ${
          recipientName || document?.user_company || "client"
        }.`,
      })
      setCustomTextFields([])
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
        <span className="text-sm text-muted-foreground font-medium">Loading Signature Studio...</span>
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
            Back to Documents
          </Button>
          <Button
            asChild
            size="sm"
            className="gap-1.5 text-xs font-semibold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/dashboard/documents/upload">
              <Plus className="h-3.5 w-3.5" />
              Upload &amp; Send New Document
            </Link>
          </Button>
        </div>
      </div>

      {/* Notice: Envelope is final once sent */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Envelope Finalised</p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Once an envelope has been sent, it is final. If you want something different, please upload and send a new document.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {livePdfUrl && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-medium gap-1.5"
              onClick={() => window.open(livePdfUrl, "_blank")}
            >
              <Eye className="h-3.5 w-3.5" /> View Current Document
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
                This document was executed and sealed on {document.signature_date ? new Date(document.signature_date).toLocaleDateString("en-GB") : "record"}.
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Side: Signer Info & Field Controls (4 cols on xl) */}
        <div className="xl:col-span-4 space-y-4">
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

          {/* Fields & Multi-Page Placement Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Fields & Page Assignment
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {detectedTotalPages} Page{detectedTotalPages > 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Assign each field to a specific page or jump directly to it in the viewer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Signature Field */}
              <div className="p-2.5 rounded-lg border bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-bold text-amber-950 dark:text-amber-200">Signature Zone</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                    Mandatory
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-muted-foreground shrink-0">Page:</span>
                  <Select
                    value={String(signaturePage)}
                    onValueChange={(val) => {
                      const p = Number(val)
                      setSignaturePage(p)
                      scrollToPage(p)
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                      <SelectValue placeholder={`Page ${signaturePage}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          Page {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => scrollToPage(signaturePage)}
                    className="h-7 px-2 text-[11px]"
                    title="Jump to this field's page"
                  >
                    Jump
                  </Button>
                </div>
              </div>

              {/* Full Name Field */}
              <div className="p-2.5 rounded-lg border bg-blue-500/5 border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-950 dark:text-blue-200">Confirm Full Name</span>
                  <Switch checked={reqFullName} onCheckedChange={setReqFullName} />
                </div>
                {reqFullName && (
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-[11px] text-muted-foreground shrink-0">Page:</span>
                    <Select
                      value={String(fullNamePage)}
                      onValueChange={(val) => {
                        const p = Number(val)
                        setFullNamePage(p)
                        scrollToPage(p)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                        <SelectValue placeholder={`Page ${fullNamePage}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            Page {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => scrollToPage(fullNamePage)}
                      className="h-7 px-2 text-[11px]"
                    >
                      Jump
                    </Button>
                  </div>
                )}
              </div>

              {/* Job Title Field */}
              <div className="p-2.5 rounded-lg border bg-indigo-500/5 border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-950 dark:text-indigo-200">Job Title</span>
                  <Switch checked={reqJobTitle} onCheckedChange={setReqJobTitle} />
                </div>
                {reqJobTitle && (
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-[11px] text-muted-foreground shrink-0">Page:</span>
                    <Select
                      value={String(jobTitlePage)}
                      onValueChange={(val) => {
                        const p = Number(val)
                        setJobTitlePage(p)
                        scrollToPage(p)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                        <SelectValue placeholder={`Page ${jobTitlePage}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            Page {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => scrollToPage(jobTitlePage)}
                      className="h-7 px-2 text-[11px]"
                    >
                      Jump
                    </Button>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="p-2.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-950 dark:text-emerald-200">Confirm Email</span>
                  <Switch checked={reqEmail} onCheckedChange={setReqEmail} />
                </div>
                {reqEmail && (
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-[11px] text-muted-foreground shrink-0">Page:</span>
                    <Select
                      value={String(emailPage)}
                      onValueChange={(val) => {
                        const p = Number(val)
                        setEmailPage(p)
                        scrollToPage(p)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                        <SelectValue placeholder={`Page ${emailPage}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            Page {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => scrollToPage(emailPage)}
                      className="h-7 px-2 text-[11px]"
                    >
                      Jump
                    </Button>
                  </div>
                )}
              </div>

              {/* Date Field */}
              <div className="p-2.5 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-950 dark:text-amber-200">Date Signed</span>
                  <Switch checked={reqDate} onCheckedChange={setReqDate} />
                </div>
                {reqDate && (
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-[11px] text-muted-foreground shrink-0">Page:</span>
                    <Select
                      value={String(datePage)}
                      onValueChange={(val) => {
                        const p = Number(val)
                        setDatePage(p)
                        scrollToPage(p)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                        <SelectValue placeholder={`Page ${datePage}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            Page {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => scrollToPage(datePage)}
                      className="h-7 px-2 text-[11px]"
                    >
                      Jump
                    </Button>
                  </div>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground">Terms Acceptance</span>
                <Switch checked={reqTermsCheck} onCheckedChange={setReqTermsCheck} />
              </div>
            </CardContent>
          </Card>

          {/* Custom Text Fields Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Type className="h-4 w-4 text-purple-600" />
                  Custom Text Fields
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newId = String(Date.now())
                    setCustomTextFields((prev) => [
                      ...prev,
                      {
                        id: newId,
                        label: `Text Field ${prev.length + 1}`,
                        page: currentVisiblePage || 1,
                        zone: { x: 0.3, y: 0.5, w: 0.35, h: 0.045 },
                      },
                    ])
                  }}
                  className="h-7 text-xs gap-1 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  <Plus className="h-3 w-3" /> Add Text Field
                </Button>
              </div>
              <CardDescription className="text-xs">
                Add text anywhere on the document. Edit text directly on the sheet or below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {customTextFields.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg text-center bg-slate-50/50 dark:bg-slate-900/50">
                  No text fields added yet. Click &ldquo;Add Text Field&rdquo; to place custom text onto the document.
                </div>
              ) : (
                customTextFields.map((tf, idx) => (
                  <div
                    key={tf.id}
                    className="p-2.5 rounded-lg border bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-purple-950 dark:text-purple-200">
                        Field {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCustomTextFields((prev) => prev.filter((item) => item.id !== tf.id))
                        }
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                        title="Remove field"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      value={tf.label}
                      onChange={(e) => {
                        const val = e.target.value
                        setCustomTextFields((prev) =>
                          prev.map((item) => (item.id === tf.id ? { ...item, label: val } : item))
                        )
                      }}
                      placeholder="Enter field text..."
                      className="h-8 text-xs bg-background"
                    />
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[11px] text-muted-foreground shrink-0">Page:</span>
                      <Select
                        value={String(tf.page || 1)}
                        onValueChange={(val) => {
                          const p = Number(val)
                          setCustomTextFields((prev) =>
                            prev.map((item) => (item.id === tf.id ? { ...item, page: p } : item))
                          )
                          scrollToPage(p)
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                          <SelectValue placeholder={`Page ${tf.page || 1}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                            <SelectItem key={p} value={String(p)}>
                              Page {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToPage(tf.page || 1)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Jump
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: DocuSign Studio Workspace (8 cols on xl) */}
        <div className="xl:col-span-8 space-y-4">
          {/* DocuSign Studio Toolbar */}
          <div className="bg-card border rounded-xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
            {/* Left: Pages thumbnail toggle + Document badge */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showThumbnails ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowThumbnails((v) => !v)}
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 border-input cursor-pointer"
                title={showThumbnails ? "Hide Page Thumbnails Rail" : "Show Page Thumbnails Rail"}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Pages</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/40 font-mono">
                  {detectedTotalPages}
                </Badge>
              </Button>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <span className="text-xs font-semibold text-foreground truncate max-w-[200px] hidden md:inline">
                {document.document_name}
              </span>
            </div>

            {/* Center: Stream Page Navigation Controls */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => scrollToPage(Math.max(1, currentVisiblePage - 1))}
                disabled={currentVisiblePage <= 1}
                className="h-7 w-7 p-0"
                title="Scroll to Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 py-0.5 rounded bg-muted/60 text-xs font-mono font-semibold flex items-center gap-1">
                <span>Page</span>
                <span className="text-primary font-bold">{currentVisiblePage}</span>
                <span className="text-muted-foreground">/</span>
                <span>{detectedTotalPages}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => scrollToPage(Math.min(detectedTotalPages, currentVisiblePage + 1))}
                disabled={currentVisiblePage >= detectedTotalPages}
                className="h-7 w-7 p-0"
                title="Scroll to Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: Tools & Precision Zoom */}
            <div className="flex items-center gap-2">
              {/* Select vs Hand Panning Tool */}
              <div className="flex items-center rounded-lg border border-input p-0.5 bg-muted/40">
                <Button
                  type="button"
                  variant={canvasTool === "select" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCanvasTool("select")}
                  className="h-6 px-2 text-[11px] font-semibold gap-1"
                  title="Select / Move Fields Tool"
                >
                  <MousePointer className="h-3 w-3" />
                  <span className="hidden sm:inline">Select</span>
                </Button>
                <Button
                  type="button"
                  variant={canvasTool === "hand" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCanvasTool("hand")}
                  className="h-6 px-2 text-[11px] font-semibold gap-1"
                  title="Hand Tool: Click and drag anywhere to pan document (or hold Spacebar)"
                >
                  <Hand className="h-3 w-3" />
                  <span className="hidden sm:inline">Pan</span>
                </Button>
              </div>

              {/* Fit to Width Button */}
              <Button
                type="button"
                variant={zoomMode === "fit" ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setZoomMode("fit")
                  setZoomScale(1.0)
                  if (studioViewportRef.current) {
                    studioViewportRef.current.scrollLeft = 0
                  }
                }}
                className="h-7 px-2.5 text-xs font-medium flex items-center gap-1 border-input"
                title="Fit Document to Full Available Width (DocuSign Standard)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fit Width</span>
              </Button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border-l pl-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setZoomMode("custom")
                    setZoomScale((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))
                  }}
                  className="h-7 w-7 p-0"
                  title="Zoom Out (-15%)"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>

                <Select
                  value={zoomMode === "fit" ? "fit" : String(Math.round(zoomScale * 100))}
                  onValueChange={(val) => {
                    if (val === "fit") {
                      setZoomMode("fit")
                      setZoomScale(1.0)
                      if (studioViewportRef.current) {
                        studioViewportRef.current.scrollLeft = 0
                      }
                    } else {
                      setZoomMode("custom")
                      setZoomScale(Number(val) / 100)
                    }
                  }}
                >
                  <SelectTrigger className="h-7 w-[84px] px-2 font-mono text-xs bg-background border-input">
                    <SelectValue placeholder={zoomMode === "fit" ? "Fit" : `${Math.round(zoomScale * 100)}%`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">Fit Width</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="100">100%</SelectItem>
                    <SelectItem value="125">125%</SelectItem>
                    <SelectItem value="150">150%</SelectItem>
                    <SelectItem value="175">175%</SelectItem>
                    <SelectItem value="200">200%</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setZoomMode("custom")
                    setZoomScale((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))
                  }}
                  className="h-7 w-7 p-0"
                  title="Zoom In (+15%)"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* DocuSign Studio Workspace (Thumbnails Strip + Continuous Document Stream) */}
          <div className="flex gap-3 w-full items-start">
            {/* Left Thumbnails Rail */}
            {showThumbnails && (
              <div className="w-24 sm:w-28 bg-slate-100 dark:bg-slate-900 border rounded-xl p-2 flex flex-col gap-2.5 shrink-0 overflow-y-auto min-h-[640px] max-h-[820px] shadow-xs select-none">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center px-1">
                  Pages ({detectedTotalPages})
                </div>
                {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => {
                  const isActive = currentVisiblePage === p
                  const fieldCount = getPageFieldCount(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => scrollToPage(p)}
                      className={cn(
                        "group relative flex flex-col items-center rounded-md border p-1 bg-white dark:bg-slate-950 transition-all text-left w-full cursor-pointer",
                        isActive
                          ? "border-primary ring-2 ring-primary/40 shadow-sm"
                          : "border-border hover:border-slate-400 dark:hover:border-slate-700 opacity-80 hover:opacity-100"
                      )}
                      title={`Jump to Page ${p}`}
                    >
                      <div className="w-full aspect-[1/1.414] overflow-hidden rounded-xs bg-slate-50 dark:bg-slate-900 flex items-center justify-center pointer-events-none relative border border-slate-200/50 dark:border-slate-800">
                        <PdfPageCanvas
                          pdfDoc={loadedPdfDoc}
                          url={livePdfUrl}
                          pageNumber={p}
                          targetWidth={92}
                          className="border-0 shadow-none rounded-none w-full h-full pointer-events-none"
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between w-full px-1">
                        <span
                          className={cn(
                            "text-[10px] font-mono font-bold",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {p}
                        </span>
                        {fieldCount > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500"
                            title={`${fieldCount} field(s) on Page ${p}`}
                          />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Continuous Document Stream Viewport */}
            <div
              ref={studioViewportRef}
              onScroll={handleStreamScroll}
              onMouseDown={handleViewportMouseDown}
              className={cn(
                "flex-1 w-full overflow-auto bg-slate-200/80 dark:bg-slate-950/80 rounded-xl border min-h-[640px] max-h-[820px] shadow-inner p-6 select-none transition-colors",
                canvasTool === "hand" || isSpacePressed
                  ? isPanning ? "cursor-grabbing" : "cursor-grab"
                  : "cursor-default"
              )}
            >
              <div className="min-w-full w-max flex flex-col items-center">
                {livePdfUrl ? (
                  Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => {
                    const fieldCount = getPageFieldCount(p)
                    return (
                      <div
                        key={p}
                        id={`doc-stream-page-${p}`}
                        data-page-number={p}
                        style={{ width: `${pageWidth}px` }}
                        className="flex flex-col items-center mb-8 last:mb-2 shrink-0"
                      >
                        {/* DocuSign Page Header Banner */}
                        <div
                          style={{ width: `${pageWidth}px` }}
                          className="mb-1.5 px-1 flex items-center justify-between text-xs text-muted-foreground select-none"
                        >
                          <span className="font-semibold tracking-wide flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-primary/70 inline-block" />
                            PAGE {p} OF {detectedTotalPages}
                          </span>
                          <span className="text-[11px] opacity-80">
                            {fieldCount > 0 ? `${fieldCount} field(s)` : "No fields"}
                          </span>
                        </div>

                        {/* Page Sheet Container */}
                        <div
                          id={`doc-page-sheet-${p}`}
                          data-doc-sheet="true"
                          style={{
                            width: `${pageWidth}px`,
                            height: `${pageHeight}px`,
                            transition: isPanning ? "none" : "width 0.12s ease-out, height 0.12s ease-out",
                          }}
                          className={cn(
                            "relative border rounded-xs shadow-2xl bg-white overflow-hidden select-none shrink-0",
                            canvasTool === "hand" || isSpacePressed
                              ? isPanning ? "cursor-grabbing" : "cursor-grab"
                              : "cursor-default"
                          )}
                        >
                          <PdfPageCanvas
                            pdfDoc={loadedPdfDoc}
                            url={livePdfUrl}
                            pageNumber={p}
                            targetWidth={pageWidth}
                            className="border-0 shadow-none rounded-none w-full h-full"
                          />

                          {/* Per-Page Fields Overlay Layer */}
                          {renderFieldsForPage(p)}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">
                    Loading document from storage...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
