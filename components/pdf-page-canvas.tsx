"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, AlertCircle, FileText } from "lucide-react"

export interface PdfPageCanvasProps {
  file?: File | null
  url?: string | null
  fallbackImageUrl?: string | null
  pageNumber: number
  scale?: number
  contentType?: string | null
  onLoadSuccess?: (info: { numPages: number; width: number; height: number }) => void
  onCanvasClick?: (coords: { x: number; y: number }) => void
  children?: React.ReactNode
  className?: string
}

// Client-side PDF.js loader that avoids Webpack 'canvas' module issues
async function getPdfJs(): Promise<any> {
  if (typeof window === "undefined") return null
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib

  return new Promise((resolve, reject) => {
    const existing = document.getElementById("pdfjs-script") as HTMLScriptElement | null
    if (existing) {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib)
      } else {
        existing.addEventListener("load", () => resolve((window as any).pdfjsLib))
        existing.addEventListener("error", reject)
      }
      return
    }

    const script = document.createElement("script")
    script.id = "pdfjs-script"
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    script.async = true
    script.onload = () => {
      const lib = (window as any).pdfjsLib
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        resolve(lib)
      } else {
        reject(new Error("pdfjsLib not initialized"))
      }
    }
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"))
    document.head.appendChild(script)
  })
}

export function PdfPageCanvas({
  file,
  url,
  fallbackImageUrl,
  pageNumber = 1,
  scale = 1.0,
  contentType,
  onLoadSuccess,
  onCanvasClick,
  children,
  className = "",
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [isImageFile, setIsImageFile] = useState(false)
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({
    width: 595,
    height: 842,
  })

  // Track render task to cancel ongoing renders if pageNumber changes rapidly
  const renderTaskRef = useRef<any>(null)

  // 1. Detect if the file or URL is an image (PNG, JPG, JPEG, WEBP)
  useEffect(() => {
    if (file) {
      const isImg = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name)
      if (isImg) {
        const objUrl = URL.createObjectURL(file)
        setIsImageFile(true)
        setImageObjectUrl(objUrl)
        setLoading(false)
        setError(null)
        if (typeof window !== "undefined") {
          const img = new Image()
          img.src = objUrl
          img.onload = () => {
            const aspect = img.naturalHeight / (img.naturalWidth || 1)
            const h = Math.round(595 * aspect)
            setPageSize({ width: 595, height: h })
            onLoadSuccess?.({ numPages: 1, width: 595, height: h })
          }
        }
        return () => {
          URL.revokeObjectURL(objUrl)
        }
      }
    }

    const isUrlImg =
      (contentType && contentType.startsWith("image/")) ||
      (url && /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url))

    if (isUrlImg && url) {
      setIsImageFile(true)
      setImageObjectUrl(url)
      setLoading(false)
      setError(null)
      if (typeof window !== "undefined") {
        const img = new Image()
        img.src = url
        img.onload = () => {
          const aspect = img.naturalHeight / (img.naturalWidth || 1)
          const h = Math.round(595 * aspect)
          setPageSize({ width: 595, height: h })
          onLoadSuccess?.({ numPages: 1, width: 595, height: h })
        }
      }
      return
    }

    setIsImageFile(false)
    setImageObjectUrl(null)
  }, [file, url, contentType, onLoadSuccess])

  // 2. Load PDF Document from File or URL
  useEffect(() => {
    const isImg =
      (file && (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name))) ||
      (contentType && contentType.startsWith("image/")) ||
      (url && /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url))

    if (isImg || isImageFile) return
    let isCancelled = false

    async function loadPdf() {
      if (!file && !url) {
        setPdfDoc(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const pdfjs = await getPdfJs()
        if (!pdfjs) throw new Error("PDF renderer unavailable in this environment")

        let docSource: any = null

        if (file) {
          const buffer = await file.arrayBuffer()
          docSource = { data: new Uint8Array(buffer) }
        } else if (url) {
          let arrayBuffer: ArrayBuffer | null = null

          // Tier 1: Direct fetch (CORS now configured on Cloudflare R2)
          try {
            const directRes = await fetch(url)
            if (directRes.ok) {
              arrayBuffer = await directRes.arrayBuffer()
            } else {
              throw new Error(`Direct fetch returned HTTP ${directRes.status}`)
            }
          } catch (directErr) {
            console.warn("Direct fetch of PDF failed, attempting server proxy...", directErr)
            // Tier 2: Same-origin Next.js server proxy fallback
            try {
              const proxyRes = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(url)}`)
              if (proxyRes.ok) {
                arrayBuffer = await proxyRes.arrayBuffer()
              } else {
                throw new Error(`Proxy fetch returned HTTP ${proxyRes.status}`)
              }
            } catch (proxyErr) {
              console.warn("Proxy fetch failed, falling back to pdfjs URL loader:", proxyErr)
              // Tier 3: Native PDF.js URL loader
              docSource = { url }
            }
          }

          if (arrayBuffer) {
            docSource = { data: new Uint8Array(arrayBuffer) }
          }
        }

        if (!docSource) return

        const loadingTask = pdfjs.getDocument(docSource)
        const doc = await loadingTask.promise

        if (isCancelled) return

        setPdfDoc(doc)
        onLoadSuccess?.({
          numPages: doc.numPages,
          width: pageSize.width,
          height: pageSize.height,
        })
      } catch (err: any) {
        console.error("PDF load error:", err)
        if (!isCancelled) {
          setError(err?.message || "Failed to parse PDF document")
          setLoading(false)
        }
      }
    }

    loadPdf()

    return () => {
      isCancelled = true
    }
  }, [file, url, isImageFile, onLoadSuccess])

  // 3. Render the specific page onto the Canvas
  useEffect(() => {
    if (isImageFile || !pdfDoc) return
    let isCancelled = false

    async function renderPage() {
      const canvas = canvasRef.current
      if (!canvas || !pdfDoc) return

      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // ignore cancel error
        }
        renderTaskRef.current = null
      }

      setLoading(true)

      try {
        const safePageNum = Math.max(1, Math.min(pageNumber, pdfDoc.numPages))
        const page = await pdfDoc.getPage(safePageNum)

        if (isCancelled) return

        // Base viewport at 72dpi
        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const displayWidth = unscaledViewport.width
        const displayHeight = unscaledViewport.height
        setPageSize({ width: displayWidth, height: displayHeight })

        // Render at higher resolution for crisp readability (2x device pixel ratio)
        const outputScale = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1.5
        const viewport = page.getViewport({ scale: outputScale })

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(displayWidth)}px`
        canvas.style.height = `${Math.floor(displayHeight)}px`

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        }

        const task = page.render(renderContext)
        renderTaskRef.current = task
        await task.promise

        if (!isCancelled) {
          setLoading(false)
          renderTaskRef.current = null
        }
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") {
          return // expected when switching pages quickly
        }
        console.error("PDF page render error:", err)
        if (!isCancelled) {
          setError(err?.message || "Could not render page")
          setLoading(false)
        }
      }
    }

    renderPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // ignore
        }
      }
    }
  }, [pdfDoc, pageNumber, isImageFile])

  // 4. Handle Click to Reposition
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!overlayRef.current || !onCanvasClick) return
      const rect = overlayRef.current.getBoundingClientRect()
      const clickX = (e.clientX - rect.left) / rect.width
      const clickY = (e.clientY - rect.top) / rect.height
      onCanvasClick({
        x: Math.max(0.02, Math.min(0.98, clickX)),
        y: Math.max(0.02, Math.min(0.98, clickY)),
      })
    },
    [onCanvasClick]
  )

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top center",
        transition: "transform 150ms ease-out",
        width: pageSize.width,
        height: pageSize.height,
      }}
      className={`relative bg-white shadow-2xl rounded-lg border select-none shrink-0 overflow-hidden ${className}`}
    >
      {/* Real Image Rendering if an image file was picked */}
      {isImageFile && imageObjectUrl && (
        <img
          src={imageObjectUrl}
          alt="Document Preview"
          className="w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Real PDF Canvas */}
      {!isImageFile && (
        <canvas
          ref={canvasRef}
          className="block w-full h-full pointer-events-none"
        />
      )}

      {/* Fallback image if PDF couldn't be loaded and a fallback image exists */}
      {!isImageFile && !pdfDoc && !loading && fallbackImageUrl && (
        <img
          src={fallbackImageUrl}
          alt={`Page ${pageNumber}`}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <span className="text-xs font-semibold text-slate-700">
            Rendering Page {pageNumber} from uploaded PDF...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="absolute inset-0 bg-white p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
          <div className="p-3 rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Could not render PDF preview</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          </div>
          {fallbackImageUrl && (
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Use standard document template preview
            </button>
          )}
        </div>
      )}

      {/* Interactive Overlay Layer for Signature & Form Fields */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="absolute inset-0 z-20 cursor-crosshair"
      >
        {children}
      </div>
    </div>
  )
}
