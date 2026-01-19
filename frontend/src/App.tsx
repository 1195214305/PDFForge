import { useState } from 'react'
import { FileUp, Settings, BookOpen } from 'lucide-react'
import PDFUploader from './components/PDFUploader'
import TOCEditor from './components/TOCEditor'
import SettingsPanel from './components/SettingsPanel'
import { usePDFStore } from './store/pdfStore'

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'edit' | 'settings'>('upload')
  const { pdfFile } = usePDFStore()

  // 自动跳转到编辑目录页面
  const handleUploadSuccess = () => {
    setActiveTab('edit')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-forge-50 via-stone-50 to-forge-100">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-forge-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-forge-900 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-forge-50" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-forge-900">PDFForge</h1>
                <p className="text-xs text-forge-600">智能PDF工坊</p>
              </div>
            </div>

            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-forge-900 text-white'
                    : 'text-forge-700 hover:bg-forge-100'
                }`}
              >
                <span className="inline-flex items-center">
                  <span className="w-5 h-5 rounded-full bg-forge-700 text-white text-xs flex items-center justify-center mr-2">1</span>
                  <FileUp className="w-4 h-4 inline-block mr-2" />
                  上传文件
                </span>
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                disabled={!pdfFile}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-forge-900 text-white'
                    : 'text-forge-700 hover:bg-forge-100 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center">
                  <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center mr-2 ${pdfFile ? 'bg-forge-700' : 'bg-gray-400'}`}>2</span>
                  <BookOpen className="w-4 h-4 inline-block mr-2" />
                  编辑目录
                </span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-forge-900 text-white'
                    : 'text-forge-700 hover:bg-forge-100'
                }`}
              >
                <span className="inline-flex items-center">
                  <span className="w-5 h-5 rounded-full bg-forge-700 text-white text-xs flex items-center justify-center mr-2">3</span>
                  <Settings className="w-4 h-4 inline-block mr-2" />
                  设置
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && <PDFUploader onUploadSuccess={handleUploadSuccess} />}
        {activeTab === 'edit' && <TOCEditor />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* 页脚 */}
      <footer className="mt-16 py-8 border-t border-forge-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-forge-600">
            本项目由
            <a
              href="https://www.aliyun.com/product/esa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-900 font-medium hover:underline mx-1"
            >
              阿里云ESA
            </a>
            提供加速、计算和保护
          </p>
          <div className="mt-4">
            <img
              src="https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png"
              alt="阿里云ESA"
              className="h-8 mx-auto opacity-80"
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
