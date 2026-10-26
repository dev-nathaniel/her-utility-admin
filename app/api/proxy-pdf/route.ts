import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const targetUrl = searchParams.get("url")

    if (!targetUrl) {
      return new NextResponse("Missing url parameter", { status: 400 })
    }

    // Basic safety check: must be a valid URL
    const parsed = new URL(targetUrl)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new NextResponse("Invalid protocol", { status: 400 })
    }

    // Server-side fetch (no browser CORS restrictions apply)
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    })

    if (!upstreamRes.ok) {
      return new NextResponse(
        `Failed to fetch upstream document: ${upstreamRes.status} ${upstreamRes.statusText}`,
        { status: upstreamRes.status }
      )
    }

    const buffer = await upstreamRes.arrayBuffer()
    const contentType = upstreamRes.headers.get("content-type") || "application/pdf"

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=300",
      },
    })
  } catch (error: any) {
    console.error("PDF Proxy Error:", error)
    return new NextResponse(`Proxy error: ${error?.message || "Unknown error"}`, {
      status: 500,
    })
  }
}
