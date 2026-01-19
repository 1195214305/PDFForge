import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Download, Trash2, Save } from 'lucide-react'
import { usePDFStore, TOCItem } from '../store/pdfStore'
import { addTOCToPDF, downloadPDF } from '../utils/pdfProcessor'

function SortableTOCItem({ item, onUpdate, onDelete }: {
  item: TOCItem
  onUpdate: (id: string, updates: Partial<TOCItem>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-forge-200 hover:border-forge-400 transition-colors"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-forge-400 hover:text-forge-600">
        <GripVertical className="w-5 h-5" />
      </button>

      <select
        value={item.level}
        onChange={(e) => onUpdate(item.id, { level: Number(e.target.value) as 1 | 2 | 3 })}
        className="px-2 py-1 border border-forge-300 rounded text-sm"
      >
        <option value={1}>一级</option>
        <option value={2}>二级</option>
        <option value={3}>三级</option>
      </select>

      <input
        type="text"
        value={item.title}
        onChange={(e) => onUpdate(item.id, { title: e.target.value })}
        className="flex-1 px-3 py-1 border border-forge-300 rounded focus:outline-none focus:ring-2 focus:ring-forge-500"
        placeholder="标题"
      />

      <input
        type="number"
        value={item.page}
        onChange={(e) => onUpdate(item.id, { page: Number(e.target.value) })}
        className="w-20 px-3 py-1 border border-forge-300 rounded focus:outline-none focus:ring-2 focus:ring-forge-500"
        placeholder="页码"
        min={1}
      />

      <button
        onClick={() => onDelete(item.id)}
        className="text-red-600 hover:text-red-700 p-1"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function TOCEditor() {
  const { pdfFile, pdfDoc, tocItems, pageOffset, setTocItems, addTocItem, updateTocItem, deleteTocItem, reorderTocItems, setPageOffset } = usePDFStore()
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tocItems.findIndex(item => item.id === active.id)
      const newIndex = tocItems.findIndex(item => item.id === over.id)
      reorderTocItems(arrayMove(tocItems, oldIndex, newIndex))
    }
  }

  const handleAddItem = () => {
    addTocItem({
      title: '新目录项',
      page: 1,
      level: 1
    })
  }

  const handleSave = async () => {
    if (!pdfDoc) {
      alert('请先上传PDF文件')
      return
    }

    if (tocItems.length === 0) {
      alert('请至少添加一个目录项')
      return
    }

    setIsSaving(true)
    try {
      const pdfBytes = await addTOCToPDF(pdfDoc, tocItems, pageOffset)
      const filename = pdfFile?.name.replace('.pdf', '_with_toc.pdf') || 'output.pdf'
      downloadPDF(pdfBytes, filename)
      alert('PDF保存成功！')
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请检查目录配置')
    } finally {
      setIsSaving(false)
    }
  }

  if (!pdfFile) {
    return (
      <div className="text-center py-16">
        <p className="text-forge-600">请先上传PDF文件</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-forge-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-forge-900 mb-1">
              编辑目录
            </h2>
            <p className="text-sm text-forge-600">
              {pdfFile.name} - 共 {pdfDoc?.getPageCount()} 页
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-forge-700">页码偏移:</label>
              <input
                type="number"
                value={pageOffset}
                onChange={(e) => setPageOffset(Number(e.target.value))}
                className="w-20 px-3 py-1 border border-forge-300 rounded focus:outline-none focus:ring-2 focus:ring-forge-500"
              />
            </div>

            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-white border border-forge-300 text-forge-900 rounded-lg hover:bg-forge-50 transition-colors"
            >
              <Plus className="w-4 h-4 inline-block mr-2" />
              添加
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-forge-900 text-white rounded-lg hover:bg-forge-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Save className="w-4 h-4 inline-block mr-2 animate-pulse" />
                  保存中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 inline-block mr-2" />
                  保存PDF
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {tocItems.length === 0 ? (
            <div className="text-center py-12 text-forge-600">
              <p>暂无目录项，点击"添加"按钮创建</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tocItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {tocItems.map(item => (
                  <SortableTOCItem
                    key={item.id}
                    item={item}
                    onUpdate={updateTocItem}
                    onDelete={deleteTocItem}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="mt-6 p-4 bg-forge-50 rounded-lg border border-forge-200">
          <h3 className="font-medium text-forge-900 mb-2">使用说明</h3>
          <ul className="text-sm text-forge-600 space-y-1">
            <li>• 拖拽左侧手柄可调整目录顺序</li>
            <li>• 页码偏移用于修正纸质页码与电子页码的差异</li>
            <li>• 支持三级目录结构（章、节、点）</li>
            <li>• 点击"保存PDF"生成带目录的新文件</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
