"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, AlertCircle, FileText } from "lucide-react"

export interface PdfPageCanvasProps {
  file?: File | null
  url?: string | null
  fallbackImageUrl?: string | null
  pageNumber: number
  scale?: number
  targetWidth?: number
  contentType?: string | null
  onLoadSuccess?: (info: { numPages: number; width: number; height: number }) => void
  onTotalPages?: (totalPages: number) => void
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

function PdfPageCanvasComponent({
  file,
  url,
  fallbackImageUrl,
  pageNumber = 1,
  scale = 1.0,
  targetWidth,
  contentType,
  onLoadSuccess,
  onTotalPages,
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

  // Callback refs so parent re-renders never trigger load effects
  const onLoadSuccessRef = useRef(onLoadSuccess)
  onLoadSuccessRef.current = onLoadSuccess

  const onTotalPagesRef = useRef(onTotalPages)
  onTotalPagesRef.current = onTotalPages

  // Track render task to cancel ongoing renders if pageNumber changes rapidly
  const renderTaskRef = useRef<any>(null)
  const currentDocKeyRef = useRef<string | null>(null)
  const renderedPageKeyRef = useRef<string | null>(null)

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
            const w = targetWidth || 595
            const h = Math.round(w * aspect)
            setPageSize({ width: w, height: h })
            onLoadSuccessRef.current?.({ numPages: 1, width: img.naturalWidth || w, height: img.naturalHeight || h })
            onTotalPagesRef.current?.(1)
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
          const w = targetWidth || 595
          const h = Math.round(w * aspect)
          setPageSize({ width: w, height: h })
          onLoadSuccessRef.current?.({ numPages: 1, width: img.naturalWidth || w, height: img.naturalHeight || h })
          onTotalPagesRef.current?.(1)
        }
      }
      return
    }

    setIsImageFile(false)
    setImageObjectUrl(null)
  }, [file, url, contentType, targetWidth])

  // 2. Load PDF Document from File or URL
  useEffect(() => {
    const isImg =
      (file && (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name))) ||
      (contentType && contentType.startsWith("image/")) ||
      (url && /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url))

    if (isImg || isImageFile) return
    let isCancelled = false

    const docKey = file ? `${file.name}-${file.size}-${file.lastModified}` : url || null
    if (!docKey) {
      setPdfDoc(null)
      setLoading(false)
      currentDocKeyRef.current = null
      return
    }

    // Prevent duplicate document loads if document hasn't changed
    if (docKey === currentDocKeyRef.current && pdfDoc) {
      onLoadSuccessRef.current?.({
        numPages: pdfDoc.numPages,
        width: pageSize.width,
        height: pageSize.height,
      })
      onTotalPagesRef.current?.(pdfDoc.numPages)
      return
    }

    async function loadPdf() {
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

          // Tier 1: Direct fetch (CORS configured on Cloudflare R2)
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

        if (!docSource || isCancelled) return

        const loadingTask = pdfjs.getDocument(docSource)
        const doc = await loadingTask.promise

        if (isCancelled) {
          try {
            doc.destroy?.()
          } catch {}
          return
        }

        // Clean up previous doc to free memory
        setPdfDoc((prevDoc: any) => {
          if (prevDoc && typeof prevDoc.destroy === "function" && prevDoc !== doc) {
            try {
              prevDoc.destroy()
            } catch {}
          }
          return doc
        })
        currentDocKeyRef.current = docKey

        try {
          const firstPage = await doc.getPage(1)
          const vp = firstPage.getViewport({ scale: 1.0 })
          onLoadSuccessRef.current?.({
            numPages: doc.numPages,
            width: Math.round(vp.width || 595),
            height: Math.round(vp.height || 842),
          })
        } catch {
          onLoadSuccessRef.current?.({
            numPages: doc.numPages,
            width: pageSize.width,
            height: pageSize.height,
          })
        }
        onTotalPagesRef.current?.(doc.numPages)
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
  }, [file, url, isImageFile])

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
          // ignore
        }
        renderTaskRef.current = null
      }

      const safePageNum = Math.max(1, Math.min(pageNumber, pdfDoc.numPages))
      const pageKey = `${currentDocKeyRef.current}-p${safePageNum}`
      const isNewPage = renderedPageKeyRef.current !== pageKey

      // Only show full loading overlay on new page or document switch
      // Re-renders for width/scale happen seamlessly in the background (double-buffered)
      if (isNewPage) {
        setLoading(true)
      }

      try {
        const page = await pdfDoc.getPage(safePageNum)

        if (isCancelled) return

        // Base viewport at 72dpi
        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const nativeWidth = unscaledViewport.width || 595
        const nativeHeight = unscaledViewport.height || 842

        // If targetWidth is specified, calculate scale to fit that width
        const widthScale = targetWidth ? targetWidth / nativeWidth : (scale || 1.0)
        const displayWidth = Math.round(nativeWidth * widthScale)
        const displayHeight = Math.round(nativeHeight * widthScale)
        setPageSize({ width: displayWidth, height: displayHeight })

        // Render at higher resolution for crisp readability (2x device pixel ratio)
        const outputScale = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1.5
        const viewport = page.getViewport({ scale: widthScale * outputScale })

        // Double buffering: render off-screen first so visible canvas NEVER blanks or flashes
        const offscreen = document.createElement("canvas")
        offscreen.width = Math.floor(viewport.width)
        offscreen.height = Math.floor(viewport.height)
        const offscreenCtx = offscreen.getContext("2d")
        if (!offscreenCtx) return

        const renderContext = {
          canvasContext: offscreenCtx,
          viewport: viewport,
        }

        const task = page.render(renderContext)
        renderTaskRef.current = task
        await task.promise

        if (isCancelled) return

        // Instantaneous buffer swap: zero flicker, 100% smooth visual transition
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = "100%"
        canvas.style.height = "100%"

        const ctx = canvas.getContext("2d")
        ctx?.drawImage(offscreen, 0, 0)

        renderedPageKeyRef.current = pageKey
        setLoading(false)
        renderTaskRef.current = null
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
        } catch {}
      }
    }
  }, [pdfDoc, pageNumber, isImageFile, targetWidth, scale])

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
        transform: targetWidth ? undefined : `scale(${scale})`,
        transformOrigin: "top center",
        transition: "transform 150ms ease-out",
        width: targetWidth ? "100%" : pageSize.width,
        height: targetWidth ? "100%" : pageSize.height,
      }}
      className={`relative bg-white select-none shrink-0 overflow-hidden ${className || "shadow-2xl rounded-lg border"}`}
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

export const PdfPageCanvas = React.memo(
  PdfPageCanvasComponent,
  (prev, next) =>
    prev.file === next.file &&
    prev.url === next.url &&
    prev.pageNumber === next.pageNumber &&
    prev.scale === next.scale &&
    prev.targetWidth === next.targetWidth &&
    prev.fallbackImageUrl === next.fallbackImageUrl &&
    prev.className === next.className
)
