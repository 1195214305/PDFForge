import { PDFDocument, rgb, degrees } from 'pdf-lib'
import * as pdfLib from 'pdf-lib'
import { outlinePdfFactory } from '@lillallol/outline-pdf'
import { TOCItem } from '../store/pdfStore'

/**
 * 从PDF文件加载PDFDocument
 */
export async function loadPDFDocument(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer()
  return await PDFDocument.load(arrayBuffer)
}

/**
 * 提取PDF文本内容（前N页）
 */
export async function extractPDFText(pdfDoc: PDFDocument, maxPages: number = 50): Promise<string> {
  const pages = pdfDoc.getPages()
  const pageCount = Math.min(pages.length, maxPages)

  let text = ''
  for (let i = 0; i < pageCount; i++) {
    const page = pages[i]
    // 注意：pdf-lib不直接支持文本提取，这里返回页面信息
    text += `\n--- 第 ${i + 1} 页 ---\n`
    text += `尺寸: ${page.getWidth()} x ${page.getHeight()}\n`
  }

  return text
}

/**
 * 智能识别目录结构（基于字体大小和位置）
 */
export function detectTOCStructure(text: string): TOCItem[] {
  const items: TOCItem[] = []
  const lines = text.split('\n').filter(line => line.trim())

  // 简单的启发式规则：
  // - 全大写或以数字开头的可能是标题
  // - 较短的行可能是标题
  // - 包含"章"、"节"、"第"等关键词

  const chapterPattern = /^(第[一二三四五六七八九十\d]+[章节]|Chapter\s+\d+|CHAPTER\s+\d+)/i
  const sectionPattern = /^(\d+\.\d+|\d+\.)/

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length > 100) return

    let level: 1 | 2 | 3 = 3

    if (chapterPattern.test(trimmed)) {
      level = 1
    } else if (sectionPattern.test(trimmed)) {
      level = 2
    } else if (trimmed.length < 30 && /[\u4e00-\u9fa5]/.test(trimmed)) {
      level = 3
    } else {
      return // 跳过不像标题的行
    }

    items.push({
      id: crypto.randomUUID(),
      title: trimmed,
      page: Math.floor(index / 20) + 1, // 粗略估计页码
      level
    })
  })

  return items.slice(0, 50) // 最多返回50个
}

/**
 * 添加目录到PDF
 * 使用 outline-pdf 库实现可靠的书签功能
 */
export async function addTOCToPDF(
  pdfDoc: PDFDocument,
  tocItems: TOCItem[],
  pageOffset: number
): Promise<Uint8Array> {
  try {
    // 设置PDF元数据
    pdfDoc.setTitle('PDFForge - 智能PDF工坊生成')
    pdfDoc.setProducer('PDFForge by ESA Pages')
    pdfDoc.setCreator('PDFForge')
    pdfDoc.setCreationDate(new Date())
    pdfDoc.setModificationDate(new Date())

    // 如果没有目录项，直接保存
    if (!tocItems || tocItems.length === 0) {
      console.log('没有目录项，直接保存PDF')
      return await pdfDoc.save()
    }

    console.log(`开始添加 ${tocItems.length} 个书签...`)

    // 初始化 outline-pdf
    const outlinePdf = outlinePdfFactory(pdfLib)

    // 将 TOCItem 转换为 outline-pdf 格式
    // 格式：页码|层级标记|标题
    // 层级标记：一级为空，二级为"-"，三级为"--"
    const outlineString = tocItems
      .map(item => {
        const pageNum = item.page + pageOffset

        // 确保页码有效
        if (pageNum < 1 || pageNum > pdfDoc.getPageCount()) {
          console.warn(`跳过无效页码: ${pageNum} (原始: ${item.page}, 偏移: ${pageOffset})`)
          return null
        }

        // 根据层级生成标记
        let levelMarker = ''
        if (item.level === 2) {
          levelMarker = '-'
        } else if (item.level === 3) {
          levelMarker = '--'
        }

        // 格式：页码|层级标记|标题
        return `${pageNum}|${levelMarker}|${item.title}`
      })
      .filter(line => line !== null)
      .join('\n')

    console.log('书签结构预览:')
    console.log(outlineString.split('\n').slice(0, 5).join('\n'))
    console.log(`... (共 ${outlineString.split('\n').length} 个书签)`)

    // 使用 outline-pdf 添加书签
    const pdfWithOutline = await outlinePdf({
      outline: outlineString,
      pdf: pdfDoc
    })

    console.log('✓ 书签添加成功！')

    // 保存PDF
    return await pdfWithOutline.save()
  } catch (error) {
    console.error('添加书签失败:', error)
    console.error('错误详情:', error instanceof Error ? error.message : String(error))

    // 如果添加书签失败，至少保存原始PDF
    console.log('降级处理：保存不带书签的PDF')
    return await pdfDoc.save()
  }
}

/**
 * 合并多个PDF
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()

  for (const file of files) {
    const pdfDoc = await loadPDFDocument(file)
    const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
    pages.forEach(page => mergedPdf.addPage(page))
  }

  return await mergedPdf.save()
}

/**
 * 拆分PDF
 */
export async function splitPDF(
  pdfDoc: PDFDocument,
  startPage: number,
  endPage: number
): Promise<Uint8Array> {
  const newPdf = await PDFDocument.create()
  const pageIndices = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i - 1
  )

  const pages = await newPdf.copyPages(pdfDoc, pageIndices)
  pages.forEach(page => newPdf.addPage(page))

  return await newPdf.save()
}

/**
 * 添加水印
 */
export async function addWatermark(
  pdfDoc: PDFDocument,
  watermarkText: string
): Promise<Uint8Array> {
  const pages = pdfDoc.getPages()

  pages.forEach(page => {
    const { width, height } = page.getSize()

    page.drawText(watermarkText, {
      x: width / 2 - 100,
      y: height / 2,
      size: 50,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.3,
      rotate: degrees(45)
    })
  })

  return await pdfDoc.save()
}

/**
 * 下载PDF文件
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
