"use client"

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
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
import { Checkbox } from "@/components/ui/checkbox"
import { apiClient, type CompanyData } from "@/lib/api-client"
import { PdfPageCanvas } from "@/components/pdf-page-canvas"
import { stampTextFieldsOnPdf } from "@/lib/pdf-stamper"
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
  HelpCircle,
  Trash2,
  Plus,
  Sparkles,
  Check,
  Type,
  Hand,
  MousePointer,
  Layers,
} from "lucide-react"

export interface SignatureZone {
  x: number
  y: number
  w: number
  h: number
}

function UploadDocumentForm() {
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

  // Step 3: Signature Zone & Fields (DocuSign Multi-Page Stream Architecture)
  const [targetPage, setTargetPage] = useState<number>(1)
  const [detectedTotalPages, setDetectedTotalPages] = useState<number>(1)
  const [loadedPdfDoc, setLoadedPdfDoc] = useState<any>(null)
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true)
  const [currentVisiblePage, setCurrentVisiblePage] = useState<number>(1)
  const [zoomMode, setZoomMode] = useState<"fit" | "custom">("fit")
  const [zoomScale, setZoomScale] = useState<number>(1.0)
  const [streamViewportWidth, setStreamViewportWidth] = useState<number>(800)

  // Per-field page assignments (DocuSign multi-page placement)
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
  const [docDimensions, setDocDimensions] = useState<{ width: number; height: number }>({
    width: 760,
    height: 1075,
  })
  const [activeDragField, setActiveDragField] = useState<string | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const studioViewportRef = useRef<HTMLDivElement>(null)

  // Studio tool states (Select Fields vs Pan Document)
  const [canvasTool, setCanvasTool] = useState<"select" | "hand">("select")
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const isPanningRef = useRef(false)

  // Hold Spacebar to temporarily activate Pan mode (universal Figma / Acrobat standard)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const target = e.target as HTMLElement
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable) {
          e.preventDefault()
          setIsSpacePressed(true)
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  // Ctrl / Cmd + Mouse Wheel smooth zoom of the PDF
  useEffect(() => {
    const vp = studioViewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY < 0 ? 0.15 : -0.15
        setZoomScale((z) => Math.max(0.5, Math.min(2.0, Number((z + delta).toFixed(2)))))
      }
    }
    vp.addEventListener("wheel", onWheel, { passive: false })
    return () => vp.removeEventListener("wheel", onWheel)
  }, [])

  // Required Field Toggles (Only signature is mandatory by default; other fields require explicit admin toggle)
  const [reqSignature, setReqSignature] = useState(true)
  const [reqFullName, setReqFullName] = useState(false)
  const [reqJobTitle, setReqJobTitle] = useState(false)
  const [reqEmail, setReqEmail] = useState(false)
  const [reqDate, setReqDate] = useState(false)
  const [reqTermsCheck, setReqTermsCheck] = useState(false)
  const [customTextFields, setCustomTextFields] = useState<
    Array<{ id: string; label: string; page: number; zone: SignatureZone; fontSize?: number }>
  >([])

  // ── DocuSign Flow States (Set Up Envelope & Fields) ──
  const [docusignStep, setDocusignStep] = useState<"envelope" | "fields">("envelope")
  const [emailSubject, setEmailSubject] = useState("Please review and sign document")
  const [emailMessage, setEmailMessage] = useState("")
  const [reminderFrequency, setReminderFrequency] = useState("Every day")
  const [selfSignNeeded, setSelfSignNeeded] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0)
  const replacingFileIndexRef = useRef<number | null>(null)
  const [additionalRecipients, setAdditionalRecipients] = useState<
    Array<{ id: string; name: string; email: string; businessId?: string }>
  >([])

  // Keep subject synced with document name
  useEffect(() => {
    if (documentName) {
      setEmailSubject((prev) => {
        if (!prev || prev === "Please review and sign document" || prev.startsWith("Please review and sign:")) {
          return `Please review and sign: ${documentName}`
        }
        return prev
      })
    }
  }, [documentName])

  // Sync signer mode with selfSignNeeded
  useEffect(() => {
    if (selfSignNeeded) {
      setSignerMode("both")
    } else {
      setSignerMode("customer")
    }
  }, [selfSignNeeded])

  const handleProceedToAddFields = () => {
    if (!selectedFile) {
      toast.error("Please upload a document to proceed.")
      fileInputRef.current?.click()
      return
    }
    if (!recipientName.trim()) {
      toast.error("Please provide the recipient's full name.")
      return
    }
    if (!recipientEmail.trim()) {
      toast.error("Please provide the recipient's email address.")
      return
    }
    if (!emailSubject.trim()) {
      toast.error("Please provide an envelope subject line.")
      return
    }

    if (emailMessage.trim()) {
      setInstructions(emailMessage.trim())
    }

    setDocusignStep("fields")
  }

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

  // Apply metadata defaults based on document name/type
  const applyDocumentDefaults = (f: File) => {
    setTargetPage(1)
    const lower = f.name.toLowerCase()
    const cleanName = f.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
    setDocumentName(cleanName)

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

  // Handle single or initial file pick
  const handleFilePicked = (f: File) => {
    setUploadedFiles([f])
    setSelectedFile(f)
    setActiveFileIndex(0)
    applyDocumentDefaults(f)
  }

  // Append additional files
  const handleAddFiles = (files: File[]) => {
    if (!files.length) return
    setUploadedFiles((prev) => {
      const next = [...prev, ...files]
      if (!selectedFile && next.length > 0) {
        setSelectedFile(next[0])
        setActiveFileIndex(0)
        applyDocumentDefaults(next[0])
      }
      return next
    })
  }

  // Trigger file input to change/replace a specific document
  const handleChangeDocument = (index: number) => {
    replacingFileIndexRef.current = index
    fileInputRef.current?.click()
  }

  // Trigger file input to add more documents
  const handleAddMoreDocuments = () => {
    replacingFileIndexRef.current = null
    fileInputRef.current?.click()
  }

  // Delete a document from envelope
  const handleDeleteDocument = (index: number) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setSelectedFile(null)
        setDocumentName("")
        setActiveFileIndex(0)
      } else if (activeFileIndex >= next.length) {
        const newIdx = next.length - 1
        setActiveFileIndex(newIdx)
        setSelectedFile(next[newIdx])
        applyDocumentDefaults(next[newIdx])
      } else if (activeFileIndex === index) {
        const newIdx = Math.min(index, next.length - 1)
        setActiveFileIndex(newIdx)
        setSelectedFile(next[newIdx])
        applyDocumentDefaults(next[newIdx])
      }
      return next
    })
  }

  // Switch which document is active for preview/placement
  const handleSelectActiveDocument = (index: number) => {
    setActiveFileIndex(index)
    setSelectedFile(uploadedFiles[index])
    setTargetPage(1)
    setDetectedTotalPages(1)
    setDocDimensions({ width: 760, height: 1075 })
  }

  // Stable callbacks for PdfPageCanvas
  const handlePdfLoadSuccess = useCallback(
    ({ numPages, width, height }: { numPages: number; width?: number; height?: number }) => {
      setDetectedTotalPages(numPages)
      setTargetPage((prev) => (prev > numPages ? 1 : prev))
      if (width && height && width > 0) {
        const aspect = height / width
        setDocDimensions({
          width: 760,
          height: Math.round(760 * aspect),
        })
      }
    },
    []
  )

  const handlePdfTotalPages = useCallback((total: number) => {
    setDetectedTotalPages(total)
    setTargetPage((prev) => (prev > total ? 1 : prev))
  }, [])

  // Load PDF Document ONCE so all pages and thumbnails share the same memory instance
  useEffect(() => {
    if (!selectedFile) {
      setLoadedPdfDoc(null)
      setDetectedTotalPages(1)
      return
    }

    const isImg =
      selectedFile.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(selectedFile.name)
    if (isImg) {
      setLoadedPdfDoc(null)
      setDetectedTotalPages(1)
      return
    }

    let isCancelled = false
    async function loadDoc() {
      try {
        const { getPdfJs } = await import("@/components/pdf-page-canvas")
        const pdfjs = await getPdfJs()
        if (!pdfjs) return
        const buffer = await selectedFile.arrayBuffer()
        if (isCancelled) return
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
        if (isCancelled) {
          try {
            doc.destroy?.()
          } catch {}
          return
        }
        setLoadedPdfDoc((prev: any) => {
          if (prev && prev !== doc && typeof prev.destroy === "function") {
            try {
              prev.destroy()
            } catch {}
          }
          return doc
        })
        setDetectedTotalPages(doc.numPages)
        try {
          const firstPage = await doc.getPage(1)
          const vp = firstPage.getViewport({ scale: 1.0 })
          setDocDimensions({
            width: 760,
            height: Math.round(760 * (vp.height / (vp.width || 1))),
          })
        } catch {}
      } catch (err) {
        console.error("Failed to load PDF doc stream:", err)
      }
    }

    loadDoc()
    return () => {
      isCancelled = true
    }
  }, [selectedFile])

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

  // DocuSign Page Dimensions Calculation
  const docAspect = docDimensions.height / (docDimensions.width || 1)
  const pageWidth = useMemo(() => {
    // Leave comfortable 48px padding (24px left, 24px right)
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

  // Smooth mouse drag panning of the PDF document across the studio viewport
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    // When in select mode, don't initiate pan if user clicked a field, input, or resize handle
    if (canvasTool === "select" && !isSpacePressed) {
      const isField = (e.target as HTMLElement).closest("[data-canvas-field]")
      const isInput = (e.target as HTMLElement).tagName === "INPUT"
      if (isField || isInput) return
      // In select mode, only drag to pan if clicking outside the document sheet (the neutral background)
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

  // Mouse Drag to Move ANY Field (Zero lag, 1:1 instantaneous cursor tracking, RAF throttled)
  const handleFieldMouseDown = (
    e: React.MouseEvent,
    fieldName: string,
    currentFieldZone: SignatureZone,
    setFieldZone: (updater: (prev: SignatureZone) => SignatureZone) => void,
    pageNum: number = 1
  ) => {
    if (canvasTool === "hand" || isSpacePressed) {
      return
    }
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

  // Mouse Drag on Resize Handles (Corner 'se', right edge 'e', bottom edge 's', RAF throttled)
  const handleFieldResizeMouseDown = (
    e: React.MouseEvent,
    fieldName: string,
    currentFieldZone: SignatureZone,
    setFieldZone: (updater: (prev: SignatureZone) => SignatureZone) => void,
    pageNum: number = 1,
    direction: "se" | "e" | "s" = "se"
  ) => {
    if (canvasTool === "hand" || isSpacePressed) {
      return
    }
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
          newW = Math.max(0.015, Math.min(0.99 - initX, initW + deltaX))
        }

        if (direction === "se" || direction === "s") {
          newH = Math.max(0.006, Math.min(0.99 - initY, initH + deltaY))
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

  // Helper: Render all fields designated for a specific page number in the continuous document stream
  const renderFieldsForPage = (pageNum: number) => {
    return (
      <>
        {/* Draggable & Resizable High-Visibility Signature Zone (DocuSign Style) */}
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
              minHeight: "20px",
              cursor: activeDragField === "signature" ? "grabbing" : "grab",
            }}
            className="border-2 border-amber-600 bg-[#fff9db] dark:bg-[#382b00] rounded-xs p-1 px-1.5 flex items-center justify-between text-xs text-amber-950 dark:text-amber-100 font-bold shadow-xl ring-2 ring-amber-400/50 hover:bg-[#fff4be] transition-colors group select-none z-30"
            title="Drag to position Signature • Use corner/edges to resize"
          >
            <div className="flex items-center gap-1.5 truncate min-w-0">
              <div className="bg-[#ffcc00] text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider flex items-center gap-1 shrink-0 border border-amber-600/40">
                <PenTool className="h-2.5 w-2.5 text-amber-950 stroke-[2.5]" />
                <span>SIGN</span>
              </div>
              <span className="truncate text-[11px] font-bold text-amber-950 dark:text-amber-100">
                {recipientName || "Customer"}
              </span>
            </div>
            <Move className="h-3 w-3 shrink-0 text-amber-800 dark:text-amber-300 opacity-80 ml-1" />

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
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white dark:border-amber-950 rounded-xs shadow-md cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
              title="Drag corner to resize width & height"
            >
              <div className="w-1.5 h-1.5 bg-white dark:bg-amber-950 rounded-full" />
            </div>
          </div>
        )}

        {/* Draggable & Resizable Full Name */}
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
              minHeight: "14px",
              cursor: activeDragField === "fullName" ? "grabbing" : "grab",
            }}
            className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/60 rounded-xs px-1.5 flex items-center justify-between text-[11px] text-blue-950 dark:text-blue-100 font-semibold shadow-xs ring-1 ring-blue-400/40 z-20 group select-none"
            title="Drag to position Full Name • Use corner/edges to resize"
          >
            <span className="truncate min-w-0">Full Name: {recipientName || "Name"}</span>
            <Move className="h-3 w-3 opacity-70 shrink-0 ml-1" />

            {/* Resize handles */}
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "fullName", fullNameZone, setFullNameZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-blue-500/30 rounded-full"
              title="Drag edge to change width"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "fullName", fullNameZone, setFullNameZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-blue-500/30 rounded-full"
              title="Drag edge to change height"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "fullName", fullNameZone, setFullNameZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
              title="Drag corner to resize width & height"
            >
              <div className="w-1 h-1 bg-blue-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Draggable & Resizable Job Title */}
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
              minHeight: "14px",
              cursor: activeDragField === "jobTitle" ? "grabbing" : "grab",
            }}
            className="border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 rounded-xs px-1.5 flex items-center justify-between text-[11px] text-indigo-950 dark:text-indigo-100 font-semibold shadow-xs ring-1 ring-indigo-400/40 z-20 group select-none"
            title="Drag to position Job Title • Use corner/edges to resize"
          >
            <span className="truncate min-w-0">Job Title: Director</span>
            <Move className="h-3 w-3 opacity-70 shrink-0 ml-1" />

            {/* Resize handles */}
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-indigo-500/30 rounded-full"
              title="Drag edge to change width"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-indigo-500/30 rounded-full"
              title="Drag edge to change height"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
              title="Drag corner to resize width & height"
            >
              <div className="w-1 h-1 bg-indigo-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Draggable & Resizable Email */}
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
              minHeight: "14px",
              cursor: activeDragField === "email" ? "grabbing" : "grab",
            }}
            className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 rounded-xs px-1.5 flex items-center justify-between text-[11px] text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs ring-1 ring-emerald-400/40 z-20 group select-none"
            title="Drag to position Email • Use corner/edges to resize"
          >
            <span className="truncate min-w-0">Email: {recipientEmail || "email@company.com"}</span>
            <Move className="h-3 w-3 opacity-70 shrink-0 ml-1" />

            {/* Resize handles */}
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "email", emailZone, setEmailZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-emerald-500/30 rounded-full"
              title="Drag edge to change width"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "email", emailZone, setEmailZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-emerald-500/30 rounded-full"
              title="Drag edge to change height"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "email", emailZone, setEmailZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-emerald-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
              title="Drag corner to resize width & height"
            >
              <div className="w-1 h-1 bg-emerald-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Draggable & Resizable Date */}
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
              minHeight: "14px",
              cursor: activeDragField === "date" ? "grabbing" : "grab",
            }}
            className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/60 rounded-xs px-1.5 flex items-center justify-between text-[11px] text-amber-950 dark:text-amber-100 font-semibold shadow-xs ring-1 ring-amber-400/40 z-20 group select-none"
            title="Drag to position Date • Use corner/edges to resize"
          >
            <span className="truncate min-w-0">Date Signed</span>
            <Move className="h-3 w-3 opacity-70 shrink-0 ml-1" />

            {/* Resize handles */}
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "date", dateZone, setDateZone, pageNum, "e")}
              className="absolute top-1 bottom-1 -right-1 w-2 cursor-e-resize z-30 hover:bg-amber-500/30 rounded-full"
              title="Drag edge to change width"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "date", dateZone, setDateZone, pageNum, "s")}
              className="absolute -bottom-1 left-1 right-1 h-2 cursor-s-resize z-30 hover:bg-amber-500/30 rounded-full"
              title="Drag edge to change height"
            />
            <div
              onMouseDown={(e) => handleFieldResizeMouseDown(e, "date", dateZone, setDateZone, pageNum, "se")}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-600 rounded-xs shadow-xs cursor-se-resize flex items-center justify-center hover:scale-125 transition-transform z-40"
              title="Drag corner to resize width & height"
            >
              <div className="w-1 h-1 bg-amber-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Draggable & Resizable Custom Text Fields */}
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
                minHeight: "12px",
                cursor: activeDragField === `customText-${tf.id}` ? "grabbing" : "grab",
              }}
              className="border-2 border-purple-500 bg-purple-50/70 dark:bg-purple-950/60 rounded-xs pl-0.5 pr-1 flex items-center justify-between text-xs text-purple-950 dark:text-purple-100 font-semibold shadow-xs ring-1 ring-purple-400/40 z-20 group select-none"
              title="Drag to position Text Field • Use corner/edges to resize"
            >
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
                title="Click to edit field text directly"
                style={{ fontSize: `${tf.fontSize || 11}px` }}
                className="w-full h-full min-w-0 bg-transparent border-0 p-0 font-semibold text-purple-950 dark:text-purple-100 placeholder:text-purple-400/70 focus:outline-hidden focus:ring-0 select-text cursor-text leading-none"
              />

              <Move className="h-2.5 w-2.5 opacity-40 group-hover:opacity-80 shrink-0 text-purple-800 dark:text-purple-300 ml-0.5 cursor-grab" />

              {/* Resize handles */}
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
                title="Drag edge to change width"
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
                title="Drag edge to change height"
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
                title="Drag corner to resize width & height"
              >
                <div className="w-1 h-1 bg-purple-600 rounded-full" />
              </div>
            </div>
          ))}
      </>
    )
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

      // 1. Stamp any custom text fields directly onto the PDF file before uploading so they are permanently visible in viewers
      let fileToUpload = selectedFile
      const activeTextFields = customTextFields
        .filter((tf) => tf.label && tf.label.trim())
        .map((tf) => ({
          page: tf.page || targetPage || 1,
          text: tf.label.trim(),
          zone: tf.zone,
          fontSize: tf.fontSize || 11,
        }))

      const isPdf =
        selectedFile.type === "application/pdf" ||
        selectedFile.name.toLowerCase().endsWith(".pdf")

      if (activeTextFields.length > 0 && isPdf) {
        try {
          fileToUpload = await stampTextFieldsOnPdf(selectedFile, selectedFile.name, activeTextFields)
          console.log(`Successfully burned ${activeTextFields.length} text fields onto PDF before upload`)
        } catch (stampErr) {
          console.warn("Could not client-stamp PDF text fields, falling back to original:", stampErr)
        }
      }

      // 2. Upload Document Form
      const formData = new FormData()
      formData.append("file", fileToUpload)
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

      // 3. If Signatures Required, configure & dispatch signature request
      if (signerMode !== "none" && docId) {
        const fields: any[] = []

        if (reqFullName) {
          fields.push({
            id: "f_name",
            page: fullNamePage || targetPage || 1,
            type: "full_name",
            label: "Confirm full name",
            required: true,
            rect: fullNameZone,
            prefill: recipientName || selectedBusiness.full_name || "",
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
            prefill: recipientEmail || selectedBusiness.email || "",
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

        // Note: customTextFields were already burned directly into the PDF before upload,
        // so they do not need to be sent as interactive signing fields to the signer.

        await apiClient.sendForSignature(docId, {
          target_page: signaturePage || targetPage || 1,
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
    <div className="min-h-screen bg-background">
      {/* ── DOCUSIGN FLOW STEP 1: SET UP ENVELOPE (MIRRORS DOCUSIGN EXACTLY) ── */}
      {docusignStep === "envelope" && (
        <div className="flex flex-col min-h-screen bg-background">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b bg-card px-4 sm:px-8 shadow-2xs">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/documents")}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                title="Exit Envelope Setup"
              >
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                Set Up Envelope
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                title="Help & Guidance"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs sm:text-sm font-medium text-foreground hover:text-primary px-3"
              >
                View Plans
              </Button>

              <Button
                size="sm"
                onClick={handleProceedToAddFields}
                className="h-9 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-md shadow-sm bg-[#4c00ff] hover:bg-[#3d00cc] text-white transition-all flex items-center gap-1.5"
              >
                Next: Add Fields
              </Button>
            </div>
          </header>

          {/* Main Envelope Body */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
              {/* 1. Add documents */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                    Add documents
                  </h2>
                  {uploadedFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {uploadedFiles.length} {uploadedFiles.length === 1 ? "document" : "documents"} loaded
                    </span>
                  )}
                </div>

                {/* Hidden File Input permanently mounted to support Change and Add More Documents */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const fileList = e.target.files
                    if (!fileList || fileList.length === 0) return
                    const incomingFiles = Array.from(fileList)

                    if (replacingFileIndexRef.current !== null) {
                      const idx = replacingFileIndexRef.current
                      const replacement = incomingFiles[0]
                      setUploadedFiles((prev) => {
                        const next = [...prev]
                        next[idx] = replacement
                        return next
                      })
                      if (idx === activeFileIndex || uploadedFiles.length <= 1) {
                        setSelectedFile(replacement)
                        applyDocumentDefaults(replacement)
                      }
                      toast.success(`Updated document: ${replacement.name}`)
                      replacingFileIndexRef.current = null
                    } else {
                      handleAddFiles(incomingFiles)
                      toast.success(`Added ${incomingFiles.length} document${incomingFiles.length > 1 ? "s" : ""}`)
                    }
                    e.target.value = ""
                  }}
                  className="hidden"
                />

                {uploadedFiles.length === 0 ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDraggingFile(true)
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDraggingFile(false)
                      const files = Array.from(e.dataTransfer.files || [])
                      if (files.length > 0) handleAddFiles(files)
                    }}
                    className={cn(
                      "rounded-xl border border-slate-200/90 dark:border-border/70 p-10 sm:p-14 text-center transition-colors",
                      isDraggingFile
                        ? "border-primary bg-primary/5"
                        : "bg-slate-50/80 dark:bg-muted/20"
                    )}
                  >
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-card border border-border/80 shadow-xs text-muted-foreground">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Drag a document here or
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        replacingFileIndexRef.current = null
                        fileInputRef.current?.click()
                      }}
                      className="h-9 px-6 text-xs sm:text-sm font-semibold rounded-md shadow-sm bg-[#4c00ff] hover:bg-[#3d00cc] text-white"
                    >
                      Upload
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {uploadedFiles.map((file, idx) => {
                      const isSelected = idx === activeFileIndex
                      return (
                        <div
                          key={`${file.name}-${idx}`}
                          className={cn(
                            "rounded-xl border p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs transition-all",
                            isSelected
                              ? "border-primary/50 bg-primary/[0.02] ring-1 ring-primary/20 dark:bg-muted/30"
                              : "border-border bg-card hover:border-border/80"
                          )}
                        >
                          <div
                            className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => handleSelectActiveDocument(idx)}
                            title="Click to select this document for signature field placement"
                          >
                            <div
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <FileText className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm text-foreground truncate" title={file.name}>
                                  {idx === activeFileIndex && documentName ? documentName : file.name}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {(file.size / 1024).toFixed(0)} KB • Ready for field placement
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleChangeDocument(idx)}
                              className="text-xs font-medium h-8"
                            >
                              Change
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(idx)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddMoreDocuments}
                        className="text-xs sm:text-sm font-medium text-primary hover:underline cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add More Documents
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Add a recipient */}
              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                    Add a recipient
                  </h2>
                  {companies.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">Client Company:</span>
                      <Select
                        value={selectedBusinessId}
                        onValueChange={(val) => {
                          setSelectedBusinessId(val)
                          const b = companies.find((c: any) => c.id === val || c._id === val)
                          if (b) {
                            setRecipientName(b.full_name || b.name || "")
                            setRecipientEmail(b.email || "")
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-48 sm:w-60 bg-card border-input">
                          <SelectValue placeholder="Quick fill from client directory" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((c: any) => (
                            <SelectItem key={c.id || c._id} value={c.id || c._id} className="text-xs">
                              {c.company_name || c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Primary Recipient Card with cyan left accent bar */}
                <div className="relative rounded-lg border border-border bg-card shadow-xs overflow-hidden">
                  {/* Cyan left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#00c9db] dark:bg-cyan-400" />

                  <div className="p-5 sm:p-6 pl-6 sm:pl-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Recipient full name"
                        className="h-10 text-sm bg-background border-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="recipient@company.com"
                        className="h-10 text-sm bg-background border-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional recipient cards if added */}
                {additionalRecipients.map((rec, index) => {
                  const colors = ["#f59e0b", "#a855f7", "#10b981", "#3b82f6"]
                  const barColor = colors[index % colors.length]
                  return (
                    <div key={rec.id} className="relative rounded-lg border border-border bg-card shadow-xs overflow-hidden mt-3">
                      <div className="absolute left-0 top-0 bottom-0 w-2.5" style={{ backgroundColor: barColor }} />
                      <div className="p-4 sm:p-5 pl-6 sm:pl-7">
                        {/* Header bar with recipient title, quick select dropdown, and remove button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              Recipient {index + 2}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-normal py-0 h-5">
                              Additional Signer
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {companies.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground hidden sm:inline">Select Client:</span>
                                <Select
                                  value={rec.businessId || ""}
                                  onValueChange={(val) => {
                                    const b = companies.find((c: any) => c.id === val || c._id === val)
                                    if (b) {
                                      setAdditionalRecipients((prev) =>
                                        prev.map((r) =>
                                          r.id === rec.id
                                            ? {
                                                ...r,
                                                businessId: val,
                                                name: b.full_name || b.name || b.company_name || "",
                                                email: b.email || "",
                                              }
                                            : r
                                        )
                                      )
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs w-44 sm:w-56 bg-background border-input">
                                    <SelectValue placeholder="Quick fill from directory" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {companies.map((c: any) => (
                                      <SelectItem key={c.id || c._id} value={c.id || c._id} className="text-xs">
                                        {c.company_name || c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setAdditionalRecipients((prev) => prev.filter((r) => r.id !== rec.id))
                              }
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              title="Remove recipient"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Name and Email inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-1.5">
                              Name <span className="text-rose-500">*</span>
                            </label>
                            <Input
                              value={rec.name}
                              onChange={(e) => {
                                const val = e.target.value
                                setAdditionalRecipients((prev) =>
                                  prev.map((r) => (r.id === rec.id ? { ...r, name: val } : r))
                                )
                              }}
                              placeholder="Recipient full name"
                              className="h-10 text-sm bg-background"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-1.5">
                              Email <span className="text-rose-500">*</span>
                            </label>
                            <Input
                              type="email"
                              value={rec.email}
                              onChange={(e) => {
                                const val = e.target.value
                                setAdditionalRecipients((prev) =>
                                  prev.map((r) => (r.id === rec.id ? { ...r, email: val } : r))
                                )
                              }}
                              placeholder="recipient@company.com"
                              className="h-10 text-sm bg-background"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Checkbox and multiple recipients link */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="docusign-self-sign"
                      checked={selfSignNeeded}
                      onCheckedChange={(checked) => setSelfSignNeeded(Boolean(checked))}
                    />
                    <label
                      htmlFor="docusign-self-sign"
                      className="text-xs sm:text-sm font-normal text-foreground cursor-pointer select-none"
                    >
                      I also need to sign the document
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalRecipients((prev) => [
                        ...prev,
                        { id: String(Date.now()), name: "", email: "" },
                      ])
                    }}
                    className="text-xs sm:text-sm font-medium text-primary hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    Add multiple recipients
                  </button>
                </div>
              </section>

              {/* 3. Add message */}
              <section className="space-y-4 pt-4 border-t border-border/60 pb-16">
                <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                  Add message
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value.slice(0, 100))}
                    maxLength={100}
                    placeholder="Please review and sign:"
                    className="h-10 text-sm bg-background border-input"
                  />
                  <div className="text-[11px] text-muted-foreground text-right mt-1">
                    {emailSubject.length}/100
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Message
                  </label>
                  <Textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value.slice(0, 10000))}
                    maxLength={10000}
                    placeholder="Enter Message"
                    rows={4}
                    className="text-sm bg-background border-input resize-y"
                  />
                  <div className="text-[11px] text-muted-foreground text-right mt-1">
                    {emailMessage.length}/10000
                  </div>
                </div>
              </section>

              {/* 4. Frequency of reminders (Commented out per user request) */}
              {/*
              <section className="space-y-2 pt-4 border-t border-border/60 pb-16">
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Frequency of reminders
                </label>
                <Select
                  value={reminderFrequency}
                  onValueChange={setReminderFrequency}
                >
                  <SelectTrigger className="w-full sm:w-56 h-10 text-sm bg-background border-input">
                    <SelectValue placeholder="Every day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Every day">Every day</SelectItem>
                    <SelectItem value="Every 2 days">Every 2 days</SelectItem>
                    <SelectItem value="Every 3 days">Every 3 days</SelectItem>
                    <SelectItem value="Every week">Every week</SelectItem>
                    <SelectItem value="No reminders">No reminders</SelectItem>
                  </SelectContent>
                </Select>
              </section>
              */}
            </div>
          </main>
        </div>
      )}

      {/* ── DOCUSIGN FLOW STEP 2: ADD FIELDS (FIELD PLACEMENT STUDIO) ── */}
      {docusignStep === "fields" && (
        <div className="flex flex-col min-h-screen bg-background">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b bg-card px-4 sm:px-8 shadow-2xs">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDocusignStep("envelope")}
                className="gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Envelope Setup
              </Button>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-semibold truncate text-foreground">
                  {documentName || selectedFile?.name || "Document"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Signer: {recipientName} ({recipientEmail})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                size="sm"
                onClick={() => uploadAndSendMutation.mutate()}
                disabled={uploadAndSendMutation.isPending}
                className="h-9 px-5 text-xs sm:text-sm font-semibold rounded-md shadow-sm bg-[#4c00ff] hover:bg-[#3d00cc] text-white flex items-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {uploadAndSendMutation.isPending ? "Sending Envelope..." : "Send Envelope"}
              </Button>
            </div>
          </header>

          {/* Placement Studio Body */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Sidebar: Signer Details & Field Toggles */}
                <div className="lg:col-span-4 space-y-4">
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

                  {/* Field Toggles */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-primary" />
                        Fields to Place
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Toggle optional fields and drag them anywhere on the page.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Signature */}
                      <div className="flex flex-col py-1.5 border-b border-border/50 gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <PenTool className="h-3.5 w-3.5 text-primary" />
                            Signature Box (Required)
                          </div>
                          <Badge className="bg-primary/10 text-primary text-[10px]">Mandatory</Badge>
                        </div>
                        {detectedTotalPages > 1 && (
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-muted-foreground">Placement:</span>
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={String(signaturePage)}
                                onValueChange={(val) => {
                                  const p = Number(val)
                                  setSignaturePage(p)
                                  scrollToPage(p)
                                }}
                              >
                                <SelectTrigger className="h-6 w-20 px-1.5 text-xs bg-background">
                                  <SelectValue placeholder={`Page ${signaturePage}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                                    <SelectItem key={p} value={String(p)} className="text-xs">
                                      Page {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => scrollToPage(signaturePage)}
                                className="text-[10px] text-primary hover:underline font-medium"
                              >
                                Jump
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Full Name */}
                      <div className="flex flex-col py-1.5 border-b border-border/50 gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                            Full Name Field
                          </div>
                          <Switch checked={reqFullName} onCheckedChange={setReqFullName} />
                        </div>
                        {reqFullName && detectedTotalPages > 1 && (
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-muted-foreground">Placement:</span>
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={String(fullNamePage)}
                                onValueChange={(val) => {
                                  const p = Number(val)
                                  setFullNamePage(p)
                                  scrollToPage(p)
                                }}
                              >
                                <SelectTrigger className="h-6 w-20 px-1.5 text-xs bg-background">
                                  <SelectValue placeholder={`Page ${fullNamePage}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                                    <SelectItem key={p} value={String(p)} className="text-xs">
                                      Page {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => scrollToPage(fullNamePage)}
                                className="text-[10px] text-primary hover:underline font-medium"
                              >
                                Jump
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Job Title */}
                      <div className="flex flex-col py-1.5 border-b border-border/50 gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                            Job Title Field
                          </div>
                          <Switch checked={reqJobTitle} onCheckedChange={setReqJobTitle} />
                        </div>
                        {reqJobTitle && detectedTotalPages > 1 && (
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-muted-foreground">Placement:</span>
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={String(jobTitlePage)}
                                onValueChange={(val) => {
                                  const p = Number(val)
                                  setJobTitlePage(p)
                                  scrollToPage(p)
                                }}
                              >
                                <SelectTrigger className="h-6 w-20 px-1.5 text-xs bg-background">
                                  <SelectValue placeholder={`Page ${jobTitlePage}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                                    <SelectItem key={p} value={String(p)} className="text-xs">
                                      Page {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => scrollToPage(jobTitlePage)}
                                className="text-[10px] text-primary hover:underline font-medium"
                              >
                                Jump
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex flex-col py-1.5 border-b border-border/50 gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Mail className="h-3.5 w-3.5 text-emerald-600" />
                            Email Field
                          </div>
                          <Switch checked={reqEmail} onCheckedChange={setReqEmail} />
                        </div>
                        {reqEmail && detectedTotalPages > 1 && (
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-muted-foreground">Placement:</span>
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={String(emailPage)}
                                onValueChange={(val) => {
                                  const p = Number(val)
                                  setEmailPage(p)
                                  scrollToPage(p)
                                }}
                              >
                                <SelectTrigger className="h-6 w-20 px-1.5 text-xs bg-background">
                                  <SelectValue placeholder={`Page ${emailPage}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                                    <SelectItem key={p} value={String(p)} className="text-xs">
                                      Page {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => scrollToPage(emailPage)}
                                className="text-[10px] text-primary hover:underline font-medium"
                              >
                                Jump
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Date Signed */}
                      <div className="flex flex-col py-1.5 border-b border-border/50 gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5 text-amber-600" />
                            Date Signed Field
                          </div>
                          <Switch checked={reqDate} onCheckedChange={setReqDate} />
                        </div>
                        {reqDate && detectedTotalPages > 1 && (
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-muted-foreground">Placement:</span>
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={String(datePage)}
                                onValueChange={(val) => {
                                  const p = Number(val)
                                  setDatePage(p)
                                  scrollToPage(p)
                                }}
                              >
                                <SelectTrigger className="h-6 w-20 px-1.5 text-xs bg-background">
                                  <SelectValue placeholder={`Page ${datePage}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                                    <SelectItem key={p} value={String(p)} className="text-xs">
                                      Page {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => scrollToPage(datePage)}
                                className="text-[10px] text-primary hover:underline font-medium"
                              >
                                Jump
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Custom Text Fields Section (Direct on-demand additions without toggle) */}
                      <div className="pt-2 border-t border-border/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            <Type className="h-3.5 w-3.5 text-purple-600" />
                            Text Fields
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTextFields((prev) => [
                                ...prev,
                                {
                                  id: String(Date.now()) + Math.random().toString(36).substring(2, 6),
                                  label: `Text Field ${prev.length + 1}`,
                                  page: currentVisiblePage || 1,
                                  zone: {
                                    x: 0.30,
                                    y: Math.min(0.85, 0.48 + prev.length * 0.05),
                                    w: 0.20,
                                    h: 0.025,
                                  },
                                  fontSize: 11,
                                },
                              ])
                            }}
                            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Text Field
                          </button>
                        </div>

                        {customTextFields.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {customTextFields.map((tf, idx) => (
                              <div
                                key={tf.id}
                                className="p-2 rounded-md border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                                    <Type className="h-3 w-3" />
                                    Text Field {idx + 1}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setCustomTextFields((prev) => prev.filter((item) => item.id !== tf.id))
                                    }
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
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
                                  placeholder="e.g. Account Number, Notes"
                                  className="h-6 text-xs bg-background"
                                />

                                {/* Font Size & Page Controls */}
                                <div className="space-y-1 pt-0.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Type className="h-3 w-3" /> Font Size:
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomTextFields((prev) =>
                                            prev.map((item) =>
                                              item.id === tf.id
                                                ? { ...item, fontSize: Math.max(4, (item.fontSize || 11) - 1) }
                                                : item
                                            )
                                          )
                                        }}
                                        className="h-5 w-5 rounded border border-input bg-background hover:bg-muted text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors"
                                        title="Decrease font size"
                                      >
                                        -
                                      </button>
                                      <Select
                                        value={String(tf.fontSize || 11)}
                                        onValueChange={(val) => {
                                          const size = Number(val)
                                          setCustomTextFields((prev) =>
                                            prev.map((item) =>
                                              item.id === tf.id ? { ...item, fontSize: size } : item
                                            )
                                          )
                                        }}
                                      >
                                        <SelectTrigger className="h-5 w-[68px] px-1.5 text-[11px] bg-background">
                                          <SelectValue placeholder={`${tf.fontSize || 11} pt`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map((s) => (
                                            <SelectItem key={s} value={String(s)} className="text-xs">
                                              {s} pt
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomTextFields((prev) =>
                                            prev.map((item) =>
                                              item.id === tf.id
                                                ? { ...item, fontSize: Math.min(36, (item.fontSize || 11) + 1) }
                                                : item
                                            )
                                          )
                                        }}
                                        className="h-5 w-5 rounded border border-input bg-background hover:bg-muted text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors"
                                        title="Increase font size"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {detectedTotalPages > 1 && (
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground">Page:</span>
                                      <div className="flex items-center gap-1.5">
                                        <Select
                                          value={String(tf.page || 1)}
                                          onValueChange={(val) => {
                                            const p = Number(val)
                                            setCustomTextFields((prev) =>
                                              prev.map((item) =>
                                                item.id === tf.id ? { ...item, page: p } : item
                                              )
                                            )
                                            scrollToPage(p)
                                          }}
                                        >
                                          <SelectTrigger className="h-5 w-20 px-1.5 text-[11px] bg-background">
                                            <SelectValue placeholder={`Page ${tf.page || 1}`} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Array.from({ length: detectedTotalPages }, (_, i) => i + 1).map((p) => (
                                              <SelectItem key={p} value={String(p)} className="text-xs">
                                                Page {p}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <button
                                          type="button"
                                          onClick={() => scrollToPage(tf.page || 1)}
                                          className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                                        >
                                          Jump
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right: PDF Canvas & Controls */}
                <div className="lg:col-span-8 space-y-3">
                  {/* DocuSign Studio Top Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl border bg-card text-xs">
                    {/* Left: Thumbnail toggle + Document switcher + Page indicator */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={showThumbnails ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowThumbnails((v) => !v)}
                        className="h-7 px-2.5 text-xs flex items-center gap-1.5"
                        title="Toggle Page Thumbnails Strip"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Thumbnails</span>
                        <Badge variant="outline" className="h-4 px-1 text-[10px] ml-0.5">
                          {detectedTotalPages}
                        </Badge>
                      </Button>

                      {uploadedFiles.length > 1 && (
                        <div className="flex items-center gap-1.5 border-l pl-2">
                          <span className="font-semibold text-foreground hidden sm:inline">Doc:</span>
                          <Select
                            value={String(activeFileIndex)}
                            onValueChange={(val) => handleSelectActiveDocument(Number(val))}
                          >
                            <SelectTrigger className="h-7 text-xs w-32 sm:w-40 bg-card border-input">
                              <SelectValue placeholder="Select Document" />
                            </SelectTrigger>
                            <SelectContent>
                              {uploadedFiles.map((f, i) => (
                                <SelectItem key={`${f.name}-${i}`} value={String(i)} className="text-xs">
                                  {f.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center gap-1 border-l pl-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={currentVisiblePage <= 1}
                          onClick={() => scrollToPage(Math.max(1, currentVisiblePage - 1))}
                          className="h-7 w-7 p-0"
                          title="Previous Page"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>

                        <span className="px-1.5 text-xs font-medium text-foreground whitespace-nowrap">
                          Page <span className="font-bold">{currentVisiblePage}</span> of {detectedTotalPages}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={currentVisiblePage >= detectedTotalPages}
                          onClick={() => scrollToPage(Math.min(detectedTotalPages, currentVisiblePage + 1))}
                          className="h-7 w-7 p-0"
                          title="Next Page"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Right: DocuSign Zoom & View Controls */}
                    <div className="flex items-center gap-1.5">
                      {/* Tool Switcher */}
                      <div className="flex items-center rounded-lg border bg-muted/60 p-0.5 gap-0.5">
                        <Button
                          type="button"
                          variant={canvasTool === "select" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCanvasTool("select")}
                          className={`h-6 px-2 text-xs font-medium gap-1 ${
                            canvasTool === "select"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Select & Move Fields (V)"
                        >
                          <MousePointer className="h-3 w-3" />
                          <span className="hidden md:inline text-[11px]">Select</span>
                        </Button>
                        <Button
                          type="button"
                          variant={canvasTool === "hand" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCanvasTool("hand")}
                          className={`h-6 px-2 text-xs font-medium gap-1 ${
                            canvasTool === "hand"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Pan Document (H or hold Spacebar)"
                        >
                          <Hand className="h-3 w-3" />
                          <span className="hidden md:inline text-[11px]">Pan</span>
                        </Button>
                      </div>

                      {/* Fit to Width (DocuSign Standard) */}
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
                                  file={selectedFile}
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
                        {selectedFile ? (
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
                                    file={selectedFile}
                                    pageNumber={p}
                                    targetWidth={pageWidth}
                                    className="border-0 shadow-none rounded-none w-full h-full"
                                    onLoadSuccess={handlePdfLoadSuccess}
                                    onTotalPages={handlePdfTotalPages}
                                  />

                                  {/* Per-Page Fields Overlay Layer */}
                                  {renderFieldsForPage(p)}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">
                            No document loaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          OLD STEPPER IMPLEMENTATION (COMMENTED OUT - PRESERVED PER USER REQUEST)
          Preserved for reference, audit compliance, and instant rollback.
         ========================================================================= */}
      {false && (
        <div className="space-y-6 pb-16 max-w-6xl mx-auto old-stepper-implementation hidden">
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
                        onMouseDown={(e) => handleFieldMouseDown(e, "fullName", fullNameZone, setFullNameZone)}
                        style={{
                          position: "absolute",
                          left: `${fullNameZone.x * 100}%`,
                          top: `${fullNameZone.y * 100}%`,
                          width: `${fullNameZone.w * 100}%`,
                          height: `${fullNameZone.h * 100}%`,
                          minHeight: "14px",
                          cursor: activeDragField === "fullName" ? "grabbing" : "grab",
                        }}
                        className="border-2 border-dashed border-amber-500 bg-white hover:bg-amber-50/60 rounded-md px-2.5 flex items-center justify-between text-xs text-slate-950 select-none font-semibold shadow-md z-20 hover:border-amber-600 hover:shadow-lg"
                        title="Drag to position Full Name anywhere on this page"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 pointer-events-none">
                          <div className="p-1 rounded bg-amber-100 text-amber-800 shrink-0">
                            <UserCheck className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Full Name: <span className="text-amber-950 font-semibold">{recipientName || selectedBusiness?.full_name || selectedBusiness?.name || "Signer Name"}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5 pointer-events-none">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                            Name
                          </span>
                          <Move className="h-3.5 w-3.5 text-amber-700 opacity-70" />
                        </div>
                      </div>
                    )}

                    {/* Job Title Indicator */}
                    {reqJobTitle && (
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, "jobTitle", jobTitleZone, setJobTitleZone)}
                        style={{
                          position: "absolute",
                          left: `${jobTitleZone.x * 100}%`,
                          top: `${jobTitleZone.y * 100}%`,
                          width: `${jobTitleZone.w * 100}%`,
                          height: `${jobTitleZone.h * 100}%`,
                          minHeight: "14px",
                          cursor: activeDragField === "jobTitle" ? "grabbing" : "grab",
                        }}
                        className="border-2 border-dashed border-indigo-500 bg-white hover:bg-indigo-50/60 rounded-md px-2.5 flex items-center justify-between text-xs text-slate-950 select-none font-semibold shadow-md z-20 hover:border-indigo-600 hover:shadow-lg"
                        title="Drag to position Job Title anywhere on this page"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 pointer-events-none">
                          <div className="p-1 rounded bg-indigo-100 text-indigo-800 shrink-0">
                            <Briefcase className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Job Title: <span className="text-indigo-950 font-semibold">Director</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5 pointer-events-none">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-950 border border-indigo-300">
                            Role
                          </span>
                          <Move className="h-3.5 w-3.5 text-indigo-700 opacity-70" />
                        </div>
                      </div>
                    )}

                    {/* Email Indicator */}
                    {reqEmail && (
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, "email", emailZone, setEmailZone)}
                        style={{
                          position: "absolute",
                          left: `${emailZone.x * 100}%`,
                          top: `${emailZone.y * 100}%`,
                          width: `${emailZone.w * 100}%`,
                          height: `${emailZone.h * 100}%`,
                          minHeight: "14px",
                          cursor: activeDragField === "email" ? "grabbing" : "grab",
                        }}
                        className="border-2 border-dashed border-emerald-500 bg-white hover:bg-emerald-50/60 rounded-md px-2.5 flex items-center justify-between text-xs text-slate-950 select-none font-semibold shadow-md z-20 hover:border-emerald-600 hover:shadow-lg"
                        title="Drag to position Email anywhere on this page"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 pointer-events-none">
                          <div className="p-1 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            <Mail className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Email: <span className="text-emerald-950 font-semibold">{recipientEmail || selectedBusiness?.email || "signer@email.com"}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5 pointer-events-none">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300">
                            Email
                          </span>
                          <Move className="h-3.5 w-3.5 text-emerald-700 opacity-70" />
                        </div>
                      </div>
                    )}

                    {/* Draggable Signature Box (Instant 1:1 mouse tracking with zero transition lag) */}
                    <div
                      onMouseDown={(e) => handleFieldMouseDown(e, "signature", zone, setZone)}
                      style={{
                        position: "absolute",
                        left: `${zone.x * 100}%`,
                        top: `${zone.y * 100}%`,
                        width: `${zone.w * 100}%`,
                        height: `${zone.h * 100}%`,
                        minHeight: "20px",
                        cursor: activeDragField === "signature" ? "grabbing" : "grab",
                      }}
                      className="border-2 border-blue-600 bg-white hover:bg-blue-50/60 rounded-lg flex items-center justify-between px-3 py-1.5 shadow-xl select-none hover:border-blue-700 hover:shadow-2xl z-30"
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
                      <div className="flex items-center gap-1.5 shrink-0 ml-2 pointer-events-none">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                          Mandatory
                        </span>
                        <Move className="h-4 w-4 text-blue-600 shrink-0" />
                      </div>
                    </div>

                    {/* Date Signed Indicator */}
                    {reqDate && (
                      <div
                        onMouseDown={(e) => handleFieldMouseDown(e, "date", dateZone, setDateZone)}
                        style={{
                          position: "absolute",
                          left: `${dateZone.x * 100}%`,
                          top: `${dateZone.y * 100}%`,
                          width: `${dateZone.w * 100}%`,
                          height: `${dateZone.h * 100}%`,
                          minHeight: "14px",
                          cursor: activeDragField === "date" ? "grabbing" : "grab",
                        }}
                        className="border-2 border-dashed border-sky-500 bg-white hover:bg-sky-50/60 rounded-md px-2.5 flex items-center justify-between text-xs text-slate-950 select-none font-semibold shadow-md z-20 hover:border-sky-600 hover:shadow-lg"
                        title="Drag to position Date Signed anywhere on this page"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0 pointer-events-none">
                          <div className="p-1 rounded bg-sky-100 text-sky-800 shrink-0">
                            <Calendar className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-xs font-bold text-slate-950">
                            Date: <span className="text-sky-950 font-semibold">DD/MM/YYYY</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5 pointer-events-none">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-950 border border-sky-300">
                            Date
                          </span>
                          <Move className="h-3.5 w-3.5 text-sky-700 opacity-70" />
                        </div>
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
  )}
</div>
)
}

export default function UploadDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
          Loading document upload studio...
        </div>
      }
    >
      <UploadDocumentForm />
    </Suspense>
  )
}
