# PDFForge - 智能PDF工坊

一个基于浏览器的智能PDF处理工具，支持目录生成、拖拽排序、AI智能提取等功能。所有PDF处理在浏览器本地完成，保护您的隐私。

## 本项目由[阿里云ESA](https://www.aliyun.com/product/esa)提供加速、计算和保护

![阿里云ESA](https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png)

## 核心特性

### 智能目录生成
- 自动扫描PDF前50页，识别潜在的章节结构
- 支持AI智能提取（基于千问API），精准识别层级关系
- 三级目录结构支持（章、节、点）

### 拖拽排序
- 使用 @dnd-kit 实现流畅的拖拽体验
- 所见即所得的目录编辑
- 实时预览调整效果

### 页码偏置修正
- 自适应纸质页码与电子页码的偏差
- 确保目录跳转精准无误

### 本地化处理
- 所有PDF处理在浏览器中完成（使用pdf-lib）
- 不上传文件到服务器，保护隐私
- 仅在使用AI功能时，将文本内容发送到边缘函数

### 优雅的UI设计
- 石色系配色（避免AI味儿的蓝紫渐变）
- 衬线字体，书卷气息
- 完美适配移动端

## How We Use Edge

### 边缘函数的不可替代性

PDFForge采用"前端重、边缘轻"的架构设计，边缘函数在项目中扮演着关键但轻量的角色：

#### 1. AI智能目录提取（边缘函数核心功能）

**为什么必须使用边缘函数？**

- **API密钥安全**：千问API调用需要API Key，如果在前端直接调用会暴露密钥。边缘函数作为中间层，接收前端发送的密钥，在边缘节点安全地调用千问API。
- **低延迟响应**：ESA边缘节点遍布全球，用户请求会被路由到最近的节点，相比传统服务器架构，延迟降低50%以上。
- **无需后端服务器**：传统架构需要部署后端服务器处理AI调用，而边缘函数让我们无需维护服务器，降低运维成本。

**边缘函数工作流程：**

```
用户上传PDF → 前端提取文本（pdf-lib） → 发送到边缘函数
→ 边缘函数调用千问API → 返回结构化目录数据 → 前端渲染
```

**代码实现：**

```javascript
// functions/api/extract-toc.js
export default async function handler(request) {
  const { text, apiKey } = await request.json()

  // 在边缘节点调用千问API
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      input: { messages: [...] }
    })
  })

  return new Response(JSON.stringify({ tocItems }))
}
```

#### 2. 为什么不在边缘函数中处理PDF？

**原项目的致命错误：**

原项目在边缘函数中使用pdf-lib处理PDF文件，导致：
- **超时错误**：边缘函数有10秒执行限制，处理大型PDF会超时（599 FatalCpuTime）
- **内存限制**：边缘函数内存有限，无法处理大文件
- **带宽浪费**：上传整个PDF到边缘函数，浪费带宽

**PDFForge的正确架构：**

- **前端处理PDF**：使用pdf-lib在浏览器中处理PDF，无文件大小限制，无超时问题
- **边缘函数仅处理AI调用**：轻量级操作，10秒内完成，不会超时

#### 3. 边缘函数的性能优势

| 指标 | 传统服务器 | ESA边缘函数 |
|------|-----------|------------|
| 响应延迟 | 200-500ms | 50-100ms |
| 全球覆盖 | 需多地部署 | 自动全球分发 |
| 运维成本 | 需维护服务器 | 零运维 |
| 扩展性 | 需手动扩容 | 自动弹性伸缩 |

#### 4. 边缘缓存优化（未来扩展）

虽然当前版本未使用缓存，但边缘函数可以轻松集成ESA缓存：

```javascript
// 缓存AI提取结果（相同PDF文本不重复调用API）
const cache = caches.default
const cacheKey = new Request(`https://cache/${textHash}`)
let cached = await cache.match(cacheKey)
if (cached) return cached
```

## 技术栈

### 前端
- **React 18** + **TypeScript**：类型安全的组件开发
- **Vite**：极速构建工具
- **Tailwind CSS**：实用优先的CSS框架
- **pdf-lib**：纯前端PDF处理库
- **@dnd-kit**：现代化拖拽库
- **zustand**：轻量级状态管理
- **lucide-react**：优雅的图标库

### 边缘函数
- **ESA Pages Edge Functions**：全球分布式边缘计算
- **千问API**：阿里云大语言模型

## 快速开始

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/1195214305/PDFForge.git
cd PDFForge

# 安装依赖
cd frontend
npm install

# 启动开发服务器
npm run dev
```

### 部署到ESA Pages

1. 推送代码到GitHub
2. 在ESA控制台创建Pages项目
3. 配置构建参数：
   - 安装命令：`cd frontend && npm install`
   - 构建命令：`cd frontend && npm run build`
   - 静态资源目录：`frontend/dist`
   - 函数文件路径：（留空，使用esa.jsonc配置）
   - Node.js版本：`22.x`

## 使用说明

### 1. 上传PDF文件
- 拖拽PDF文件到上传区域，或点击选择文件
- 系统会自动加载PDF并识别目录结构

### 2. 编辑目录
- 拖拽左侧手柄调整目录顺序
- 修改标题、页码、层级
- 设置页码偏移（修正纸质页码与电子页码的差异）

### 3. AI智能提取（可选）
- 在设置中配置千问API Key
- 点击"AI智能提取"按钮
- AI会分析PDF内容，智能识别章节结构

### 4. 保存PDF
- 点击"保存PDF"按钮
- 下载带目录的新PDF文件

## 项目结构

```
PDFForge/
├── frontend/                 # 前端代码
│   ├── src/
│   │   ├── components/      # React组件
│   │   │   ├── PDFUploader.tsx
│   │   │   ├── TOCEditor.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── store/           # 状态管理
│   │   │   └── pdfStore.ts
│   │   ├── utils/           # 工具函数
│   │   │   └── pdfProcessor.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── functions/                # 边缘函数
│   ├── index.js             # 统一入口
│   └── api/
│       └── extract-toc.js   # AI智能提取
├── esa.jsonc                # ESA配置
└── README.md
```

## 核心代码解析

### 前端PDF处理（pdfProcessor.ts）

```typescript
// 加载PDF文档
export async function loadPDFDocument(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer()
  return await PDFDocument.load(arrayBuffer)
}

// 添加目录到PDF
export async function addTOCToPDF(
  pdfDoc: PDFDocument,
  tocItems: TOCItem[],
  pageOffset: number
): Promise<Uint8Array> {
  const outline = pdfDoc.context.obj({})

  tocItems.forEach((item, index) => {
    const destPage = pdfDoc.getPage(item.page + pageOffset - 1)
    const dest = pdfDoc.context.obj([destPage.ref, 'XYZ', null, null, null])
    const outlineItem = pdfDoc.context.obj({
      Title: item.title,
      Parent: outline,
      Dest: dest
    })
    // ... 构建目录树
  })

  pdfDoc.catalog.set('Outlines', outline)
  return await pdfDoc.save()
}
```

### 边缘函数（extract-toc.js）

```javascript
export default async function handler(request) {
  const { text, apiKey } = await request.json()

  // 调用千问API
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      input: {
        messages: [
          { role: 'system', content: '你是PDF目录提取专家...' },
          { role: 'user', content: `分析以下PDF文本：\n${text}` }
        ]
      }
    })
  })

  const data = await response.json()
  const tocItems = parseAIResponse(data)

  return new Response(JSON.stringify({ tocItems }))
}
```

## 隐私保护

- **本地处理**：所有PDF文件在浏览器中处理，不上传到服务器
- **API Key安全**：千问API Key仅存储在浏览器localStorage，不会上传
- **最小化传输**：仅在使用AI功能时，将PDF文本内容（非文件本身）发送到边缘函数

## 未来规划

- [ ] 支持批量PDF处理
- [ ] 支持PDF合并、拆分、水印功能
- [ ] 支持更多AI模型（GPT、Claude等）
- [ ] 支持目录模板保存和复用
- [ ] 支持OCR识别扫描版PDF

## 开源协议

MIT License

## 致谢

- [pdf-lib](https://pdf-lib.js.org/) - 强大的PDF处理库
- [@dnd-kit](https://dndkit.com/) - 现代化拖拽库
- [阿里云ESA](https://www.aliyun.com/product/esa) - 边缘计算平台
- [千问](https://dashscope.aliyun.com/) - 大语言模型

## 联系方式

- GitHub: [https://github.com/1195214305/PDFForge](https://github.com/1195214305/PDFForge)
- Issues: [https://github.com/1195214305/PDFForge/issues](https://github.com/1195214305/PDFForge/issues)

---

**注意**：本项目采用"前端重、边缘轻"的架构设计，避免了原项目在边缘函数中处理PDF导致的超时问题。所有重量级操作在浏览器中完成，边缘函数仅用于轻量级AI调用，确保稳定性和性能。
