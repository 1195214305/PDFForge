import { useState } from 'react'
import { Plus, Trash2, GripVertical, Download, Save } from 'lucide-react'
import { usePDFStore, TOCItem } from '../store/pdfStore'
import { addTOCToPDF, downloadPDF } from '../utils/pdfProcessor'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableItemProps {
  item: TOCItem
  onUpdate: (id: string, updates: Partial<TOCItem>) => void
  onDelete: (id: string) => void
}

function SortableItem({ item, onUpdate, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-forge-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center space-x-3">
        <button
          {...attributes}
          {...listeners}
          className="text-forge-400 hover:text-forge-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <select
          value={item.level}
          onChange={(e) => onUpdate(item.id, { level: parseInt(e.target.value) as 1 | 2 | 3 })}
          className="px-2 py-1 border border-forge-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-forge-500"
        >
          <option value="1">一级</option>
          <option value="2">二级</option>
          <option value="3">三级</option>
        </select>

        <input
          type="text"
          value={item.title}
          onChange={(e) => onUpdate(item.id, { title: e.target.value })}
          placeholder="标题"
          className="flex-1 px-3 py-2 border border-forge-300 rounded focus:outline-none focus:ring-2 focus:ring-forge-500"
        />

        <input
          type="number"
          value={item.page}
          onChange={(e) => onUpdate(item.id, { page: parseInt(e.target.value) || 1 })}
          placeholder="页码"
          className="w-20 px-3 py-2 border border-forge-300 rounded focus:outline-none focus:ring-2 focus:ring-forge-500"
        />

        <button
          onClick={() => onDelete(item.id)}
          className="text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default function TOCEditor() {
  const { pdfDoc, tocItems, pageOffset, addTocItem, updateTocItem, deleteTocItem, reorderTocItems, setPageOffset } = usePDFStore()
  const [isGenerating, setIsGenerating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
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

  const handleGeneratePDF = async () => {
    if (!pdfDoc) {
      alert('请先上传PDF文件')
      return
    }

    if (tocItems.length === 0) {
      alert('请至少添加一个目录项')
      return
    }

    setIsGenerating(true)
    try {
      const pdfBytes = await addTOCToPDF(pdfDoc, tocItems, pageOffset)
      downloadPDF(pdfBytes, 'output-with-toc.pdf')
      alert('PDF生成成功！')
    } catch (error) {
      console.error('PDF生成失败:', error)
      alert('PDF生成失败，请检查目录配置')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!pdfDoc) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-forge-200 p-12 text-center">
          <p className="text-forge-600">请先上传PDF文件</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-forge-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-forge-900 mb-2">
              编辑目录
            </h2>
            <p className="text-forge-600">
              共 {pdfDoc.getPageCount()} 页，{tocItems.length} 个目录项
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-white border border-forge-300 text-forge-900 rounded-lg hover:bg-forge-50 transition-colors font-medium"
            >
              <Plus className="w-4 h-4 inline-block mr-2" />
              添加目录项
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating || tocItems.length === 0}
              className="px-4 py-2 bg-forge-900 text-white rounded-lg hover:bg-forge-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Save className="w-4 h-4 inline-block mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 inline-block mr-2" />
                  生成PDF
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-forge-50 rounded-lg border border-forge-200">
          <label className="block text-sm font-medium text-forge-900 mb-2">
            页码偏移量
          </label>
          <p className="text-sm text-forge-600 mb-3">
            如果PDF的实际页码与显示页码不一致（如封面、目录页），可以设置偏移量
          </p>
          <input
            type="number"
            value={pageOffset}
            onChange={(e) => setPageOffset(parseInt(e.target.value) || 0)}
            className="w-32 px-3 py-2 border border-forge-300 rounded focus:outline-none focus:ring-2 focus:ring-forge-500"
          />
        </div>

        <div className="space-y-3">
          {tocItems.length === 0 ? (
            <div className="text-center py-12 text-forge-500">
              暂无目录项，点击"添加目录项"开始编辑
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tocItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {tocItems.map(item => (
                  <SortableItem
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

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">使用提示</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 拖拽左侧图标可以调整目录顺序</li>
            <li>• 目录层级分为一级、二级、三级</li>
            <li>• 页码从1开始，确保页码在PDF范围内</li>
            <li>• 生成的PDF将包含可点击的书签导航</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
