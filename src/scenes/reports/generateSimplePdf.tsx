// src/scenes/reports/generateSimplePdf.tsx
import type { RefObject } from 'react'
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage
} from 'pdf-lib'
import { saveAs } from 'file-saver'
import type { Dayjs } from 'dayjs'

import { exportPlatformChartsAsImages } from '@/utils/chartImageExport'
import type { ModalReport, MetricDoc } from '@/scenes/reports/types'
import { PLATFORM_CHART_GROUPS } from '@/scenes/reports/platformGroups'

/* ============================================================================
   Helpers
============================================================================ */

const dataUrlToBytes = (dataUrl: string) =>
  Uint8Array.from(atob((dataUrl || '').split(',')[1] || ''), c =>
    c.charCodeAt(0)
  )

const norm = (s: string) => s?.toLowerCase?.().trim?.() || s

async function fetchImageAsBytes (path: string): Promise<Uint8Array> {
  const res = await fetch(path)
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
}

function wrapText (
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = String(text || '').split(' ')
  const lines: string[] = []
  let current = ''

  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    const width = font.widthOfTextAtSize(test, fontSize)
    if (width < maxWidth) current = test
    else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Two-across compact row placed right under a section heading. */
async function drawTopChartsRow (
  pdfDoc: PDFDocument,
  page: PDFPage,
  images: Array<{ title: string; dataUrl: string }>,
  yTop: number,
  opts: {
    margin?: number
    gap?: number
    maxCellH?: number
    cellBg?: string
  } = {}
) {
  const { margin = 50, gap = 12, maxCellH = 150, cellBg } = opts
  const PW = page.getWidth()
  const colW = (PW - margin * 2 - gap) / 2
  const firstTwo = images.slice(0, 2)

  for (let i = 0; i < firstTwo.length; i++) {
    const it = firstTwo[i]
    const png = await pdfDoc.embedPng(
      Uint8Array.from(atob((it.dataUrl || '').split(',')[1] || ''), c =>
        c.charCodeAt(0)
      )
    )
    const scale = Math.min(colW / png.width, maxCellH / png.height)
    const w = png.width * scale
    const h = png.height * scale

    const xCell = margin + i * (colW + gap)
    const xImg = xCell + (colW - w) / 2
    const yImg = yTop - h

    if (cellBg) {
      const r = parseInt(cellBg.slice(1, 3), 16) / 255
      const g = parseInt(cellBg.slice(3, 5), 16) / 255
      const b = parseInt(cellBg.slice(5, 7), 16) / 255
      page.drawRectangle({
        x: xCell,
        y: yImg,
        width: colW,
        height: h,
        color: rgb(r, g, b)
      })
    }

    page.drawImage(png, { x: xImg, y: yImg, width: w, height: h })
  }

  // next y cursor (row height + small spacer)
  return yTop - maxCellH - 12
}

function drawMetricsTable (
  page: PDFPage,
  metrics: Array<{
    label: string
    value: string | number
    industryAverage?: string | number
  }> = [],
  font: PDFFont,
  startX: number,
  startY: number
) {
  const rowHeight = 20
  const colWidths = [200, 100, 120]
  const headers = ['Metric', 'Value', 'Industry Avg.']

  for (let i = 0; i < headers.length; i++) {
    const colX = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
    page.drawRectangle({
      x: colX,
      y: startY,
      width: colWidths[i],
      height: rowHeight,
      color: rgb(0.9, 0.9, 0.9)
    })
    page.drawText(headers[i], {
      x: colX + 5,
      y: startY + 5,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    })
  }

  let y = startY - rowHeight

  for (const m of metrics) {
    const rowValues = [
      String(m?.label ?? '—'),
      String(m?.value ?? '—'),
      String(m?.industryAverage ?? 'N/A')
    ]
    for (let i = 0; i < rowValues.length; i++) {
      const colX = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
      page.drawRectangle({
        x: colX,
        y,
        width: colWidths[i],
        height: rowHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5
      })
      page.drawText(rowValues[i], {
        x: colX + 5,
        y: y + 5,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      })
    }
    y -= rowHeight
  }

  return y
}

/** Safe metric-doc builder; tolerates missing range/history/rows. */
function historyToMetricDocs (
  pfKey: string,
  platformMetricsHistory: Record<string, any[]> = {},
  range?: [Dayjs | undefined, Dayjs | undefined]
): MetricDoc[] {
  const raw = platformMetricsHistory?.[pfKey] || []
  const hist: any[] = Array.isArray(raw) ? raw.filter(Boolean) : []

  let start: string | null = null
  let end: string | null = null
  if (
    range &&
    range[0] &&
    range[1] &&
    typeof (range[0] as any).format === 'function' &&
    typeof (range[1] as any).format === 'function'
  ) {
    start = (range[0] as any).format('YYYY-MM')
    end = (range[1] as any).format('YYYY-MM')
  }

  return hist
    .filter(row => {
      const p = String(row?.period ?? '')
      if (!start || !end) return true
      return p >= start && p <= end
    })
    .map(row => {
      const metrics: Record<string, number> = {}
      if (row && typeof row === 'object') {
        Object.entries(row).forEach(([k, v]) => {
          if (k !== 'period' && typeof v === 'number') metrics[norm(k)] = v
        })
      }
      return { platform: pfKey, period: String(row?.period ?? ''), metrics }
    })
}

/** Rasterize a Highcharts ref (if present) to PNG data URL with a solid bg. */
async function chartRefToPngDataUrl (
  chartRef?: RefObject<any>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chart = chartRef?.current?.chart
    if (chart && typeof chart.getSVG === 'function') {
      const svg = chart.getSVG()
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        URL.revokeObjectURL(url)
        resolve(dataUrl)
      }
      img.onerror = err => {
        URL.revokeObjectURL(url)
        reject(err)
      }
      img.crossOrigin = 'anonymous'
      img.src = url
    } else {
      reject(new Error('Chart not ready or missing getSVG()'))
    }
  })
}

/* ============================================================================
   Public API
============================================================================ */

export type GeneratePdfArgs = {
  modalReport: ModalReport
  platformMetricsHistory: Record<string, any[]>
  dateRange?: [Dayjs | undefined, Dayjs | undefined]
  consolidatedChartRef?: RefObject<any>
  funnelChartRef?: RefObject<any>
}

export async function generateSimplePdfWithWatermark ({
  modalReport,
  platformMetricsHistory,
  dateRange,
  consolidatedChartRef,
  funnelChartRef
}: GeneratePdfArgs) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Assets
  const [watermarkBytes, coverBytes, letterHeadBytes] = await Promise.all([
    fetchImageAsBytes('/images/watermark.png'),
    fetchImageAsBytes('/images/cover-page.png'),
    fetchImageAsBytes('/images/letter-head.png')
  ])
  const watermarkImage = await pdfDoc.embedPng(watermarkBytes)
  const coverImage = await pdfDoc.embedPng(coverBytes)
  const letterHeadImage = await pdfDoc.embedPng(letterHeadBytes)

  // Page geometry
  const pageWidth = 595
  const pageHeight = 842
  const headerH = 30
  const headerGap = 28
  const marginX = 50
  const contentTop = pageHeight - headerH - headerGap // start content below letterhead
  const contentBottom = 40 // leave room for page number/footer
  const textWidth = pageWidth - marginX * 2

  const newWatermarkedPage = () => {
    const page = pdfDoc.addPage([pageWidth, pageHeight])

    page.drawImage(watermarkImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      opacity: 0.2
    })

    // letterhead
    page.drawImage(letterHeadImage, {
      x: 0,
      y: pageHeight - headerH,
      width: pageWidth,
      height: headerH
    })

    // subtle rule under the letterhead (optional but looks clean)
    const ruleY = pageHeight - headerH - 8 // 8pt below the image
    page.drawRectangle({
      x: marginX,
      y: ruleY,
      width: pageWidth - marginX * 2,
      height: 0.6,
      color: rgb(0.85, 0.85, 0.85)
    })

    return page
  }

  /* ------------------------------- Cover ------------------------------- */
  const cover = pdfDoc.addPage([pageWidth, pageHeight])
  cover.drawImage(watermarkImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    opacity: 0.2
  })
  cover.drawImage(letterHeadImage, {
    x: 0,
    y: pageHeight - headerH,
    width: pageWidth,
    height: headerH
  })
  cover.drawImage(coverImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight
  })

  const monthLabel = String(modalReport?.period || '').toUpperCase()
  const monthLabelWidth = font.widthOfTextAtSize(monthLabel, 18)
  cover.drawText(monthLabel, {
    x: pageWidth - monthLabelWidth - 40,
    y: 40,
    size: 18,
    font,
    color: rgb(0, 0, 0)
  })

  /* ---------------------------- Overview ---------------------------- */
  let page = newWatermarkedPage()
  page.drawText('Overview Across All Platforms', {
    x: marginX,
    y: contentTop,
    size: 14,
    font
  })

  let y = contentTop - 40
  for (const line of wrapText(
    modalReport?.overview || '',
    font,
    12,
    textWidth
  )) {
    page.drawText(line, { x: marginX, y, size: 12, font, color: rgb(0, 0, 0) })
    y -= 16
  }

  if (consolidatedChartRef) {
    try {
      const dataUrl = await chartRefToPngDataUrl(consolidatedChartRef)
      const img = await pdfDoc.embedPng(dataUrlToBytes(dataUrl))
      const needH = 200 + 20
      if (y < contentBottom + needH) {
        page = newWatermarkedPage()
        y = contentTop - 20
      }
      page.drawImage(img, { x: marginX, y: y - 200, width: 400, height: 200 })
      y -= needH
    } catch {
      /* ignore */
    }
  }
  // Funnel chart directly under the consolidated bar (overview)
  if (funnelChartRef) {
    try {
      const dataUrl = await chartRefToPngDataUrl(funnelChartRef)
      const img = await pdfDoc.embedPng(dataUrlToBytes(dataUrl))
      const needH = 200 + 20
      if (y < contentBottom + needH) {
        page = newWatermarkedPage()
        y = contentTop - 20
      }
      page.drawImage(img, { x: marginX, y: y - 200, width: 400, height: 200 })
      y -= needH
    } catch {
      /* ignore */
    }
  }

  /* ----------------------- Per-platform sections ----------------------- */
  const platforms = Array.isArray(modalReport?.platforms)
    ? modalReport.platforms
    : []

  for (const pf of platforms) {
    const pfName = String(pf?.name || 'Platform')
    const pfKey = pfName.toLowerCase()

    page = newWatermarkedPage()
    page.drawText(pfName, { x: marginX, y: contentTop, size: 18, font })
    let yP = contentTop - 30

    // export platform charts once
    // --- export platform charts once
    const metricDocs = historyToMetricDocs(
      pfKey,
      platformMetricsHistory,
      dateRange
    )
    const groups = PLATFORM_CHART_GROUPS?.[pfKey] || []
    let images: Array<{ title: string; dataUrl: string }> = []
    try {
      images = await exportPlatformChartsAsImages({
        platform: pfKey,
        range: dateRange,
        chartGroups: groups,
        metricDocs,
        size: { width: 1200, height: 600 }
      })
    } catch {
      images = []
    }

    // --- SAFETY: de-duplicate any identical chart images
    {
      const seen = new Set<string>()
      images = images.filter(img => {
        const key = img.dataUrl // full dataUrl is OK here
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // === draw ALL charts in compact rows (2 per row), before metrics/observations
    const maxCellH = 150
    let idx = 0
    while (idx < images.length) {
      if (yP < contentBottom + maxCellH + 12) {
        page = newWatermarkedPage()
        page.drawText(`${pfName} (cont’d)`, {
          x: marginX,
          y: contentTop,
          size: 14,
          font
        })
        yP = contentTop - 30
      }
      yP = await drawTopChartsRow(
        pdfDoc,
        page,
        images.slice(idx, idx + 2), // draw two at a time
        yP,
        { margin: marginX, gap: 14, maxCellH, cellBg: '#23242A' }
      )
      idx += 2
    }

    // 2) metrics table
    if (Array.isArray(pf?.metrics) && pf.metrics.length) {
      if (yP < contentBottom + 80) {
        page = newWatermarkedPage()
        page.drawText(`${pfName} (cont’d)`, {
          x: marginX,
          y: contentTop,
          size: 14,
          font
        })
        yP = contentTop - 30
      }
      yP = drawMetricsTable(page, pf.metrics, font, marginX, yP)
      yP -= 10
    } else {
      page.drawText('No metrics available.', {
        x: marginX,
        y: yP - 20,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5)
      })
      yP -= 40
    }

    // 3) observations
    if (yP < contentBottom + 60) {
      page = newWatermarkedPage()
      page.drawText(`${pfName} (cont’d)`, {
        x: marginX,
        y: contentTop,
        size: 14,
        font
      })
      yP = contentTop - 30
    }
    page.drawText('Key Observations:', { x: marginX, y: yP, size: 14, font })
    yP -= 20

    if (Array.isArray(pf?.observations) && pf.observations.length) {
      for (const obs of pf.observations) {
        for (const line of wrapText(`• ${obs}`, font, 10, textWidth)) {
          if (yP < contentBottom) {
            page = newWatermarkedPage()
            page.drawText(`${pfName} (cont’d)`, {
              x: marginX,
              y: contentTop,
              size: 14,
              font
            })
            yP = contentTop - 30
          }
          page.drawText(line, { x: marginX, y: yP, size: 10, font })
          yP -= 14
        }
      }
    } else {
      page.drawText('No observations available.', {
        x: marginX,
        y: yP,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5)
      })
      yP -= 20
    }
  }

  /* ----------------------------- SWOT ----------------------------- */
  page = newWatermarkedPage()
  page.drawText('Environmental Assessment', {
    x: marginX,
    y: contentTop,
    size: 18,
    font
  })
  let ySWOT = contentTop - 40

  const swot = (modalReport?.swot ?? {}) as NonNullable<ModalReport['swot']>
  for (const [category, items] of Object.entries(swot)) {
    page.drawText(String(category || '').toUpperCase(), {
      x: marginX,
      y: ySWOT,
      size: 14,
      font
    })
    ySWOT -= 20
    for (const item of items || []) {
      for (const line of wrapText(`• ${item}`, font, 10, textWidth)) {
        if (ySWOT < contentBottom) {
          page = newWatermarkedPage()
          page.drawText('Environmental Assessment (cont’d)', {
            x: marginX,
            y: contentTop,
            size: 14,
            font
          })
          ySWOT = contentTop - 30
        }
        page.drawText(line, { x: marginX, y: ySWOT, size: 10, font })
        ySWOT -= 14
      }
    }
    ySWOT -= 10
  }

  /* -------------------------- Action Plans ------------------------- */
  page = newWatermarkedPage()
  page.drawText('Action Plans', { x: marginX, y: contentTop, size: 18, font })
  let yRec = contentTop - 40

  const recs = (modalReport?.recommendations ?? {}) as NonNullable<
    ModalReport['recommendations']
  >
  for (const [category, items] of Object.entries(recs)) {
    page.drawText(String(category || '').toUpperCase(), {
      x: marginX,
      y: yRec,
      size: 14,
      font
    })
    yRec -= 20
    for (const item of items || []) {
      for (const line of wrapText(`• ${item}`, font, 10, textWidth)) {
        if (yRec < contentBottom) {
          page = newWatermarkedPage()
          page.drawText('Action Plans (cont’d)', {
            x: marginX,
            y: contentTop,
            size: 14,
            font
          })
          yRec = contentTop - 30
        }
        page.drawText(line, { x: marginX, y: yRec, size: 10, font })
        yRec -= 14
      }
    }
    yRec -= 10
  }

  /* ---------------------------- Conclusion ---------------------------- */
  page = newWatermarkedPage()
  page.drawText('Conclusion', { x: marginX, y: contentTop, size: 18, font })
  let yConcl = contentTop - 40

  for (const paragraph of String(modalReport?.conclusion || '').split('\n')) {
    for (const line of wrapText(paragraph, font, 12, textWidth)) {
      if (yConcl < contentBottom) {
        page = newWatermarkedPage()
        page.drawText('Conclusion (cont’d)', {
          x: marginX,
          y: contentTop,
          size: 14,
          font
        })
        yConcl = contentTop - 30
      }
      page.drawText(line, { x: marginX, y: yConcl, size: 12, font })
      yConcl -= 16
    }
    yConcl -= 8
  }

  page.drawText(`Prepared by: ${modalReport?.preparedBy || ''}`, {
    x: marginX,
    y: yConcl - 40,
    size: 10,
    font
  })

  /* ------------------------ Footer page numbers ----------------------- */
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica)

  function drawFooter (p: PDFPage, index: number, total: number) {
    // horizontal line above the footer
    const lineY = 32 // raise/lower the footer area if needed
    p.drawRectangle({
      x: marginX,
      y: lineY + 10,
      width: pageWidth - marginX * 2,
      height: 0.6,
      color: rgb(0.85, 0.85, 0.85)
    })

    // "4 | P a g e" right-aligned
    const label = `${index + 1} | P a g e`
    const size = 10
    const w = fontReg.widthOfTextAtSize(label, size)
    p.drawText(label, {
      x: pageWidth - marginX - w,
      y: lineY,
      size,
      font: fontReg,
      color: rgb(0.35, 0.35, 0.35)
    })
  }

  // after you've created all pages:
  const pageCount = pdfDoc.getPageCount()
  for (let i = 0; i < pageCount; i++)
    drawFooter(pdfDoc.getPage(i), i, pageCount)

  /* --------------------------------- Save -------------------------------- */
  const bytes = await pdfDoc.save()
  saveAs(
    new Blob([bytes], { type: 'application/pdf' }),
    `${String(modalReport?.companyName || 'Report')}_SocialMediaReport.pdf`
  )
}
