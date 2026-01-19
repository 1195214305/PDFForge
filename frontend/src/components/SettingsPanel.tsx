import { useState } from 'react'
import { Key, Save, Eye, EyeOff } from 'lucide-react'
import { usePDFStore } from '../store/pdfStore'

export default function SettingsPanel() {
  const { qianwenApiKey, setQianwenApiKey } = usePDFStore()
  const [apiKey, setApiKey] = useState(qianwenApiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setQianwenApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-forge-200 p-8">
        <h2 className="text-2xl font-serif font-bold text-forge-900 mb-6">
          设置
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-forge-900 mb-2">
              <Key className="w-4 h-4 inline-block mr-2" />
              千问API Key
            </label>
            <p className="text-sm text-forge-600 mb-3">
              用于AI智能目录提取功能，API Key仅存储在浏览器本地
            </p>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-forge-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forge-500 pr-12"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-400 hover:text-forge-600"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-forge-900 text-white rounded-lg hover:bg-forge-800 transition-colors font-medium"
              >
                <Save className="w-4 h-4 inline-block mr-2" />
                {saved ? '已保存' : '保存'}
              </button>
            </div>
          </div>

          <div className="p-4 bg-forge-50 rounded-lg border border-forge-200">
            <h3 className="font-medium text-forge-900 mb-2">如何获取千问API Key？</h3>
            <ol className="text-sm text-forge-600 space-y-2">
              <li>1. 访问阿里云百炼平台：<a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-forge-900 underline">https://bailian.console.aliyun.com/</a></li>
              <li>2. 登录后进入"API-KEY管理"</li>
              <li>3. 创建新的API Key并复制</li>
              <li>4. 粘贴到上方输入框并保存</li>
            </ol>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">隐私说明</h3>
            <p className="text-sm text-blue-700">
              您的API Key仅存储在浏览器本地（localStorage），不会上传到任何服务器。
              PDF文件的所有处理都在浏览器中完成，仅在使用AI智能提取功能时，会将PDF文本内容发送到边缘函数进行分析。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
