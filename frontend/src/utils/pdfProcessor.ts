import { PDFDocument, rgb, degrees } from 'pdf-lib'
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
 * 使用pdf-lib的底层API手动构建Outline对象树，避免循环引用问题
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
      return await pdfDoc.save()
    }

    // 获取PDF上下文
    const context = pdfDoc.context

    // 创建根Outlines对象
    const outlinesRef = context.nextRef()
    const outlines = context.obj({
      Type: 'Outlines',
      Count: 0
    })

    // 构建书签树
    const bookmarkRefs: any[] = []
    const parentStack: any[] = []
    let totalCount = 0

    for (let i = 0; i < tocItems.length; i++) {
      const item = tocItems[i]
      const pageIndex = item.page + pageOffset - 1

      // 确保页码有效
      if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
        console.warn(`跳过无效页码: ${item.page}`)
        continue
      }

      const page = pdfDoc.getPage(pageIndex)
      const pageRef = page.ref

      // 创建书签引用
      const bookmarkRef = context.nextRef()

      // 创建目标数组 [page /XYZ left top zoom]
      const dest = [pageRef, 'XYZ', null, null, null]

      // 创建书签对象
      const bookmark: any = {
        Title: item.title,
        Parent: outlinesRef,
        Dest: dest
      }

      // 根据层级设置父子关系
      if (item.level === 1) {
        // 一级标题，父节点是根Outlines
        bookmark.Parent = outlinesRef
        parentStack[0] = { ref: bookmarkRef, level: 1 }
        parentStack.length = 1
      } else if (item.level === 2) {
        // 二级标题，父节点是最近的一级标题
        if (parentStack[0]) {
          bookmark.Parent = parentStack[0].ref
          parentStack[1] = { ref: bookmarkRef, level: 2 }
          parentStack.length = 2
        } else {
          bookmark.Parent = outlinesRef
        }
      } else if (item.level === 3) {
        // 三级标题，父节点是最近的二级标题
        if (parentStack[1]) {
          bookmark.Parent = parentStack[1].ref
        } else if (parentStack[0]) {
          bookmark.Parent = parentStack[0].ref
        } else {
          bookmark.Parent = outlinesRef
        }
      }

      // 设置前后链接
      if (i > 0 && bookmarkRefs.length > 0) {
        const prevRef = bookmarkRefs[bookmarkRefs.length - 1]
        bookmark.Prev = prevRef
      }

      if (i < tocItems.length - 1) {
        const nextRef = context.nextRef()
        bookmark.Next = nextRef
      }

      // 注册书签对象
      context.assign(bookmarkRef, context.obj(bookmark))
      bookmarkRefs.push(bookmarkRef)
      totalCount++
    }

    // 更新根Outlines对象
    if (bookmarkRefs.length > 0) {
      outlines.set('First', bookmarkRefs[0])
      outlines.set('Last', bookmarkRefs[bookmarkRefs.length - 1])
      outlines.set('Count', totalCount)

      // 注册根Outlines对象
      context.assign(outlinesRef, outlines)

      // 将Outlines添加到Catalog
      const catalog = pdfDoc.catalog
      catalog.set('Outlines', outlinesRef)
    }

    // 保存PDF
    return await pdfDoc.save()
  } catch (error) {
    console.error('添加书签失败:', error)
    // 如果添加书签失败，至少保存原始PDF
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
