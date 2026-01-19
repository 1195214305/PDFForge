import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react'
import { usePDFStore } from '../store/pdfStore'
import { loadPDFDocument, extractPDFText, detectTOCStructure } from '../utils/pdfProcessor'

interface PDFUploaderProps {
  onUploadSuccess?: () => void
}

export default function PDFUploader({ onUploadSuccess }: PDFUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { setPdfFile, setPdfDoc, setTocItems, qianwenApiKey } = usePDFStore()

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      alert('请上传PDF文件')
      return
    }

    setIsLoading(true)
    try {
      const pdfDoc = await loadPDFDocument(file)
      setPdfFile(file)
      setPdfDoc(pdfDoc)

      // 自动提取目录结构
      const text = await extractPDFText(pdfDoc, 50)
      const detectedTOC = detectTOCStructure(text)
      setTocItems(detectedTOC)

      alert(`PDF加载成功！共 ${pdfDoc.getPageCount()} 页，自动识别 ${detectedTOC.length} 个目录项`)

      // 上传成功后自动跳转到编辑目录页面
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error) {
      console.error('PDF加载失败:', error)
      alert('PDF加载失败，请检查文件是否损坏')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAIExtract = async () => {
    if (!qianwenApiKey) {
      alert('请先在设置中配置千问API Key')
      return
    }

    const { pdfDoc } = usePDFStore.getState()
    if (!pdfDoc) {
      alert('请先上传PDF文件')
      return
    }

    setIsExtracting(true)
    try {
      const text = await extractPDFText(pdfDoc, 50)

      const response = await fetch('/api/extract-toc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, apiKey: qianwenApiKey })
      })

      if (!response.ok) {
        throw new Error('AI提取失败')
      }

      const { tocItems } = await response.json()
      setTocItems(tocItems)
      alert(`AI智能提取成功！识别 ${tocItems.length} 个目录项`)
    } catch (error) {
      console.error('AI提取失败:', error)
      alert('AI提取失败，请检查API Key或网络连接')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-forge-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif font-bold text-forge-900 mb-2">
            上传PDF文件
          </h2>
          <p className="text-forge-600">
            支持拖拽上传，所有处理在浏览器本地完成，保护您的隐私
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive
              ? 'border-forge-900 bg-forge-50'
              : 'border-forge-300 hover:border-forge-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />

          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-16 h-16 text-forge-600 animate-spin mb-4" />
              <p className="text-forge-700 font-medium">正在加载PDF...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-forge-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-forge-700" />
              </div>
              <p className="text-forge-900 font-medium mb-2">
                拖拽PDF文件到此处，或点击选择文件
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-6 py-3 bg-forge-900 text-white rounded-lg hover:bg-forge-800 transition-colors font-medium"
              >
                <Upload className="w-4 h-4 inline-block mr-2" />
                选择文件
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-forge-50 rounded-lg border border-forge-200">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-forge-700 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-forge-900 mb-1">AI智能目录提取</h3>
              <p className="text-sm text-forge-600 mb-3">
                使用千问AI分析PDF内容，智能识别章节结构和层级关系
              </p>
              <button
                onClick={handleAIExtract}
                disabled={isExtracting || !qianwenApiKey}
                className="px-4 py-2 bg-white border border-forge-300 text-forge-900 rounded-lg hover:bg-forge-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                    AI分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 inline-block mr-2" />
                    AI智能提取
                  </>
                )}
              </button>
              {!qianwenApiKey && (
                <p className="text-xs text-red-600 mt-2">
                  请先在设置中配置千问API Key
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
