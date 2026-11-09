import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export interface TextFieldStampItem {
  page: number
  text: string
  zone: { x: number; y: number; w: number; h: number }
  fontSize?: number
}

/**
 * Clean text string so standard WinAnsi font encoding never throws an unhandled encoding error.
 */
function sanitizeForPdfWinAnsi(input: string): string {
  if (!input) return ""
  return input
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // En/em dash
    .replace(/[\u2022\u25AA\u25A0\u2023]/g, "-") // Bullets / squares
    .replace(/[\u2713\u2714]/g, "v") // Checkmarks
    .replace(/[^\x00-\xFF]/g, " ") // Strip any remaining characters outside WinAnsi Latin-1
}

/**
 * Stamps custom text fields directly onto a PDF File or ArrayBuffer using pdf-lib.
 * Returns a new File with the text burned into the PDF pages.
 */
export async function stampTextFieldsOnPdf(
  input: File | Blob | ArrayBuffer,
  fileName: string,
  textFields: TextFieldStampItem[]
): Promise<File> {
  const arrayBuffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()

  for (const tf of textFields) {
    const rawVal = (tf.text || "").trim()
    if (!rawVal) continue
    const textVal = sanitizeForPdfWinAnsi(rawVal)
    if (!textVal.trim()) continue

    const pageIndex = (tf.page || 1) - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { width, height } = page.getSize()

    // Zone coordinates are normalized (0..1) from top-left origin
    // PDF coordinates have (0,0) at bottom-left origin
    const boxX = tf.zone.x * width
    const boxH = tf.zone.h * height
    const boxW = tf.zone.w * width
    const boxY = height - (tf.zone.y * height) - boxH

    // Use custom font size if specified, otherwise scale to box height
    const fontSize = tf.fontSize && tf.fontSize > 0
      ? tf.fontSize
      : Math.min(12, Math.max(8.5, boxH * 0.45))

    // Position text cleanly inside the box
    const textX = boxX + 4
    const textY = boxY + Math.max(2, (boxH - fontSize) / 2 + 1)

    try {
      page.drawText(textVal, {
        x: textX,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0.06, 0.09, 0.16), // #0f172a slate-900
        maxWidth: Math.max(10, boxW - 8),
      })
    } catch (drawErr) {
      console.warn("Could not draw text field onto page:", textVal, drawErr)
    }
  }

  const modifiedBytes = await pdfDoc.save()
  return new File([modifiedBytes], fileName, { type: "application/pdf" })
}
