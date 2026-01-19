import { create } from 'zustand'
import { PDFDocument } from 'pdf-lib'

export interface TOCItem {
  id: string
  title: string
  page: number
  level: 1 | 2 | 3
}

interface PDFState {
  pdfFile: File | null
  pdfDoc: PDFDocument | null
  tocItems: TOCItem[]
  pageOffset: number
  qianwenApiKey: string

  setPdfFile: (file: File | null) => void
  setPdfDoc: (doc: PDFDocument | null) => void
  setTocItems: (items: TOCItem[]) => void
  addTocItem: (item: Omit<TOCItem, 'id'>) => void
  updateTocItem: (id: string, updates: Partial<TOCItem>) => void
  deleteTocItem: (id: string) => void
  reorderTocItems: (items: TOCItem[]) => void
  setPageOffset: (offset: number) => void
  setQianwenApiKey: (key: string) => void
  reset: () => void
}

export const usePDFStore = create<PDFState>((set) => ({
  pdfFile: null,
  pdfDoc: null,
  tocItems: [],
  pageOffset: 0,
  qianwenApiKey: localStorage.getItem('qianwen_api_key') || '',

  setPdfFile: (file) => set({ pdfFile: file }),

  setPdfDoc: (doc) => set({ pdfDoc: doc }),

  setTocItems: (items) => set({ tocItems: items }),

  addTocItem: (item) => set((state) => ({
    tocItems: [...state.tocItems, { ...item, id: crypto.randomUUID() }]
  })),

  updateTocItem: (id, updates) => set((state) => ({
    tocItems: state.tocItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  })),

  deleteTocItem: (id) => set((state) => ({
    tocItems: state.tocItems.filter(item => item.id !== id)
  })),

  reorderTocItems: (items) => set({ tocItems: items }),

  setPageOffset: (offset) => set({ pageOffset: offset }),

  setQianwenApiKey: (key) => {
    localStorage.setItem('qianwen_api_key', key)
    set({ qianwenApiKey: key })
  },

  reset: () => set({
    pdfFile: null,
    pdfDoc: null,
    tocItems: [],
    pageOffset: 0
  })
}))
