export interface SignatureZone {
  x: number // 0 to 1 normalised from left
  y: number // 0 to 1 normalised from top
  w: number // 0 to 1 normalised width
  h: number // 0 to 1 normalised height
}

export interface SignaturePlacementPreset {
  id: string
  label: string
  description: string
  targetPage: number
  zone: SignatureZone
  docTypes: string[]
}

export const SIGNATURE_PRESETS: SignaturePlacementPreset[] = [
  {
    id: "loa_signatory_table",
    label: "LOA Authorised Signatory Block (Page 1)",
    description: "Aligns with the dedicated 5-row authorised signatory execution table at the bottom of the LOA.",
    targetPage: 1,
    zone: { x: 0.32, y: 0.79, w: 0.61, h: 0.052 },
    docTypes: ["signed_loa", "unsigned_loa", "loa"],
  },
  {
    id: "contract_execution_deed",
    label: "Contract Execution Deed (Page 2)",
    description: "Aligns with the formal deed & acceptance box on Page 2 of the commercial supply agreement.",
    targetPage: 2,
    zone: { x: 0.32, y: 0.43, w: 0.60, h: 0.06 },
    docTypes: ["contract", "signed_contract", "supplier_confirmation"],
  },
  {
    id: "contract_schedule_bottom",
    label: "Contract Schedule Approval (Page 1 Bottom)",
    description: "Places initial/signature at the foot of Schedule 1 principal tariff rates.",
    targetPage: 1,
    zone: { x: 0.08, y: 0.86, w: 0.84, h: 0.05 },
    docTypes: ["contract", "signed_contract"],
  },
  {
    id: "custom",
    label: "Custom Document Space",
    description: "Pick custom coordinates or click directly on the document preview to designate signature space.",
    targetPage: 1,
    zone: { x: 0.25, y: 0.75, w: 0.50, h: 0.08 },
    docTypes: ["all"],
  },
]

/**
 * Authentic Cloudflare R2 preview rasters for documents.
 * Allows the admin to see the live document page while picking signature placement.
 */
export const DOCUMENT_PAGE_PREVIEWS: Record<string, { page: number; url: string; width: number; height: number }[]> = {
  loa: [
    {
      page: 1,
      url: "https://f6d2d2ca5b76fb5fb296f1e3410c80b8.r2.cloudflarestorage.com/price-buddy/pricebuddy/documents/pages/loa_page_1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=845d93596db2f301c74d2e5e6114b803%2F20261012%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261012T190454Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=865898fbe7252f8b75c5ec5a5d4342d18eb892e40d0a7d37a5b16c1633a1d684",
      width: 1191,
      height: 1684,
    },
  ],
  contract: [
    {
      page: 1,
      url: "https://f6d2d2ca5b76fb5fb296f1e3410c80b8.r2.cloudflarestorage.com/price-buddy/pricebuddy/documents/pages/contract_page_1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=845d93596db2f301c74d2e5e6114b803%2F20261012%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261012T190454Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=db48329e7183643acac7ae74282dff633a5d8398ea025c89c90b4f4116be4141",
      width: 1191,
      height: 1684,
    },
    {
      page: 2,
      url: "https://f6d2d2ca5b76fb5fb296f1e3410c80b8.r2.cloudflarestorage.com/price-buddy/pricebuddy/documents/pages/contract_page_2.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=845d93596db2f301c74d2e5e6114b803%2F20261012%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261012T190455Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=936518add985ad0e775d07f9b5e9175f47129a4b7aaf2ed5df18c4d37c336646",
      width: 1191,
      height: 1684,
    },
  ],
  quote: [
    {
      page: 1,
      url: "https://f6d2d2ca5b76fb5fb296f1e3410c80b8.r2.cloudflarestorage.com/price-buddy/pricebuddy/documents/pages/quote_page_1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=845d93596db2f301c74d2e5e6114b803%2F20261012%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261012T190456Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=ed4a9a4cc57c83efb4f84cf26bff8e240f1958443c704fd12761c2d561e16e04",
      width: 1191,
      height: 1684,
    },
  ],
  bill: [
    {
      page: 1,
      url: "https://f6d2d2ca5b76fb5fb296f1e3410c80b8.r2.cloudflarestorage.com/price-buddy/pricebuddy/documents/pages/bill_page_1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=845d93596db2f301c74d2e5e6114b803%2F20261012%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261012T190456Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=a8ce8cc5bf758c7a0b459925a7a3465ee97f97d8636310105c1d720224861849",
      width: 1191,
      height: 1684,
    },
  ],
  report: [
    {
      page: 1,
      url: "https://f6d2d2ca5b76fb5fb296f1e3410c80b8.r2.cloudflarestorage.com/price-buddy/pricebuddy/documents/pages/report_page_1.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=845d93596db2f301c74d2e5e6114b803%2F20261012%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261012T190457Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=f9c3899c1cc6349b4742403da3d8afa35049b0963e80eff616ec48569ff76010",
      width: 1191,
      height: 1684,
    },
  ],
}

/** Identify document archetype by analyzing document title, type, and storage path. */
export function identifyDocumentCategory(doc?: { document_type?: string; document_name?: string; storage_path?: string }): "contract" | "quote" | "bill" | "report" | "loa" {
  if (!doc) return "loa"
  const s = `${doc.document_name || ""} ${doc.document_type || ""} ${doc.storage_path || ""}`.toLowerCase()
  if (s.includes("contract") || s.includes("agreement") || s.includes("deed") || s.includes("supply")) {
    return "contract"
  }
  if (s.includes("quote") || s.includes("comparison") || s.includes("tender") || s.includes("tariff")) {
    return "quote"
  }
  if (s.includes("bill") || s.includes("invoice") || s.includes("statement")) {
    return "bill"
  }
  if (s.includes("report") || s.includes("audit") || s.includes("carbon") || s.includes("consumption")) {
    return "report"
  }
  return "loa"
}

export function getDocumentPreviewPageUrl(
  docOrType?: { document_type?: string; document_name?: string; storage_path?: string } | string,
  pageNumber: number = 1
): string | null {
  let category: "contract" | "quote" | "bill" | "report" | "loa" = "loa"
  if (typeof docOrType === "string") {
    category = identifyDocumentCategory({ document_name: docOrType, document_type: docOrType })
  } else if (docOrType) {
    category = identifyDocumentCategory(docOrType)
  }

  const pages = DOCUMENT_PAGE_PREVIEWS[category] || DOCUMENT_PAGE_PREVIEWS["loa"]
  const found = pages.find((p) => p.page === pageNumber)
  return found ? found.url : pages[0]?.url || null
}

export function getDocumentPageCount(
  docOrType?: { document_type?: string; document_name?: string; storage_path?: string } | string
): number {
  let category: "contract" | "quote" | "bill" | "report" | "loa" = "loa"
  if (typeof docOrType === "string") {
    category = identifyDocumentCategory({ document_name: docOrType, document_type: docOrType })
  } else if (docOrType) {
    category = identifyDocumentCategory(docOrType)
  }
  return DOCUMENT_PAGE_PREVIEWS[category]?.length || 1
}
