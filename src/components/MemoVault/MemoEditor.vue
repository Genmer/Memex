<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { 
  X, 
  Save, 
  Pin, 
  Star, 
  Bold, 
  Italic, 
  Code2, 
  CheckSquare, 
  Quote, 
  Table, 
  Clock, 
  Tag as TagIcon, 
  Layers, 
  Columns, 
  Edit3, 
  Trash2,
  List,
  Plus,
  Check,
  ChevronDown,
  Sparkles,
  FileText,
  Brain,
  Calendar
} from 'lucide-vue-next'
import { renderMarkdown, copyCodeFromClick, extractCleanTitle } from '../../utils/markdown'
import { useToast } from '../../composables/useToast'

const toast = useToast()

const props = defineProps<{
  show: boolean,
  memo: any | null,
  availableFolders: string[]
}>()

const emit = defineEmits(['close', 'save', 'delete'])

const title = ref('')
const content = ref('')
const folder = ref('默认备忘')
const customFolders = ref<string[]>([])
const newFolderInput = ref('')
const newFolderInputRef = ref<HTMLInputElement | null>(null)
const previousFolder = ref('')
const isAddingFolder = ref(false)

const allFolders = computed(() => {
  const set = new Set([...props.availableFolders, ...customFolders.value])
  if (folder.value && folder.value !== '__new__') {
    set.add(folder.value)
  }
  return Array.from(set).filter(Boolean)
})

const startAddingFolder = () => {
  previousFolder.value = folder.value !== '__new__' ? folder.value : (allFolders.value[0] || '默认备忘')
  newFolderInput.value = ''
  isAddingFolder.value = true
  nextTick(() => {
    newFolderInputRef.value?.focus()
  })
}

const confirmNewFolder = () => {
  const trimmed = newFolderInput.value.trim()
  if (trimmed) {
    if (!customFolders.value.includes(trimmed)) {
      customFolders.value.push(trimmed)
    }
    folder.value = trimmed
    toast.success(`已创建并切换分类: ${trimmed}`)
  } else if (previousFolder.value) {
    folder.value = previousFolder.value
  }
  isAddingFolder.value = false
}

const cancelNewFolder = () => {
  if (previousFolder.value && previousFolder.value !== '__new__') {
    folder.value = previousFolder.value
  } else {
    folder.value = allFolders.value[0] || '默认备忘'
  }
  isAddingFolder.value = false
}

const handleFolderSelect = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  if (val === '__new__') {
    startAddingFolder()
  }
}
const noteType = ref<'markdown' | 'memory' | 'journal' | 'todo' | 'fleeting' | 'code'>('markdown')
const color = ref<'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple'>('default')
const tagList = ref<string[]>([])
const newTagInput = ref('')
const isPinned = ref(false)
const isFavorite = ref(false)
const isMobileScreen = ref(typeof window !== 'undefined' && window.innerWidth < 768)
const viewMode = ref<'split' | 'preview' | 'edit'>(typeof window !== 'undefined' && window.innerWidth < 768 ? 'preview' : 'split')

const editorTextarea = ref<HTMLTextAreaElement | null>(null)

const checkScreenSize = () => {
  if (typeof window !== 'undefined') {
    isMobileScreen.value = window.innerWidth < 768
    if (isMobileScreen.value && viewMode.value === 'split') {
      viewMode.value = 'preview'
    }
  }
}


const addTag = (tagToAdd?: string) => {
  const t = (tagToAdd || newTagInput.value).trim().replace(/^#/, '')
  if (!t) return
  if (!tagList.value.includes(t)) {
    tagList.value.push(t)
    toast.success(`已添加标签: #${t}`)
  } else {
    toast.info(`标签 #${t} 已存在`)
  }
  newTagInput.value = ''
}

const removeTag = (tagToRemove: string) => {
  tagList.value = tagList.value.filter(t => t !== tagToRemove)
  toast.info(`已移除标签: #${tagToRemove}`)
}

const handleTagKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  }
}

watch(() => props.memo, (m) => {
  if (m) {
    title.value = m.title || ''
    content.value = m.content || ''
    folder.value = m.folder || '默认备忘'
    noteType.value = m.note_type || 'markdown'
    color.value = m.color || 'default'
    tagList.value = m.tags ? m.tags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean) : []
    newTagInput.value = ''
    isPinned.value = !!m.is_pinned
    isFavorite.value = !!m.is_favorite
  } else {
    // New memo defaults
    title.value = ''
    content.value = ''
    folder.value = props.availableFolders[0] || '默认备忘'
    noteType.value = 'markdown'
    color.value = 'default'
    tagList.value = []
    newTagInput.value = ''
    isPinned.value = false
    isFavorite.value = false
  }
}, { immediate: true })

const renderedMarkdown = computed(() => {
  return renderMarkdown(content.value || '*暂无内容*')
})

const codeLanguages = [
  { label: 'JSON 格式', value: 'json' },
  { label: 'Properties / 配置文件', value: 'properties' },
  { label: 'YAML / YML', value: 'yaml' },
  { label: 'HTML / XML', value: 'html' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Bash / Shell 脚本', value: 'bash' },
  { label: 'SQL 数据库查询', value: 'sql' },
  { label: 'Python', value: 'python' },
  { label: 'Rust', value: 'rust' },
  { label: 'CSS 样式', value: 'css' },
  { label: 'Markdown 文档', value: 'markdown' },
  { label: 'Plain Text 纯文本', value: 'text' }
]

const showCodeMenu = ref(false)
const codeMenuRef = ref<HTMLElement | null>(null)
const selectedCodeLang = ref<string>('')

// Detect current active code language from content
const currentCodeLang = computed(() => {
  const trimmed = content.value.trim()
  const match = trimmed.match(/^```([a-zA-Z0-9_-]*)/)
  if (match && match[1]) {
    return match[1].toLowerCase()
  }
  return selectedCodeLang.value || ''
})

const getLangLabel = (val: string) => {
  if (!val) return '代码块'
  const item = codeLanguages.find(l => l.value.toLowerCase() === val.toLowerCase())
  return item ? item.label.split(' ')[0] : val.toUpperCase()
}

const removeCodeBlock = () => {
  showCodeMenu.value = false
  selectedCodeLang.value = ''

  const trimmed = content.value.trim()
  // 1. If entire content is wrapped in a code block ```lang\n...\n```
  const fullBlockMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n?```$/)
  if (fullBlockMatch) {
    content.value = fullBlockMatch[1] + '\n'
    toast.success('已清除代码块格式，恢复普通文本')
    return
  }

  // 2. If user has text selected in textarea wrapped in ```...```
  if (editorTextarea.value) {
    const textarea = editorTextarea.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.value.substring(start, end)

    if (selectedText) {
      const selMatch = selectedText.trim().match(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n?```$/)
      if (selMatch) {
        const unwrapped = selMatch[1]
        content.value = content.value.substring(0, start) + unwrapped + content.value.substring(end)
        toast.success('已解除所选区域的代码块')
        return
      }
    }
  }

  // 3. Fallback if starts with ```
  if (trimmed.startsWith('```')) {
    const stripped = trimmed.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, '').replace(/\r?\n?```$/, '')
    content.value = stripped + '\n'
    toast.success('已清除代码块标记')
    return
  }

  toast.info('已清除格式选择，当前为普通文本')
}

const applyCodeLanguage = (lang: string) => {
  showCodeMenu.value = false
  selectedCodeLang.value = lang

  // If in preview mode, switch to split mode on insert
  if (viewMode.value === 'preview') {
    viewMode.value = 'split'
  }

  const trimmed = content.value.trim()

  // 1. If content is already wrapped in a code block, replace its language header!
  const fullBlockMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n?```$/)
  if (fullBlockMatch) {
    const innerCode = fullBlockMatch[2]
    content.value = `\`\`\`${lang}\n${innerCode}\n\`\`\`\n`
    toast.success(`已切换代码语言为: ${lang.toUpperCase()}`)
    return
  }

  // 2. If user has text selected in textarea, wrap that selection
  if (editorTextarea.value) {
    const textarea = editorTextarea.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.value.substring(start, end)

    if (selectedText) {
      const selMatch = selectedText.trim().match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n?```$/)
      let replacement = ''
      if (selMatch) {
        replacement = `\`\`\`${lang}\n${selMatch[2]}\n\`\`\`\n`
      } else {
        replacement = `\`\`\`${lang}\n${selectedText}\n\`\`\`\n`
      }
      content.value = content.value.substring(0, start) + replacement + content.value.substring(end)
      toast.success(`已将所选文本转为: ${lang.toUpperCase()}`)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + lang.length + 4, start + replacement.length - 4)
      }, 50)
      return
    }
  }

  // 3. If content is not empty and doesn't have code block, wrap entire content
  if (trimmed) {
    content.value = `\`\`\`${lang}\n${trimmed}\n\`\`\`\n`
    toast.success(`已将全文包裹为: ${lang.toUpperCase()}`)
    return
  }

  // 4. If content is empty, insert empty code template
  const template = `\`\`\`${lang}\n\n\`\`\`\n`
  content.value = template
  toast.success(`已插入 ${lang.toUpperCase()} 代码块`)
  setTimeout(() => {
    if (editorTextarea.value) {
      editorTextarea.value.focus()
      editorTextarea.value.setSelectionRange(lang.length + 4, lang.length + 4)
    }
  }, 50)
}

const handlePreviewClick = async (event: MouseEvent) => {
  const target = event.target as HTMLElement
  
  // 1. Copy code block button
  const copyBtn = target.closest('.copy-code-btn') as HTMLElement
  if (copyBtn) {
    await copyCodeFromClick(event)
    return
  }

  // 2. Interactive Task Checkbox Toggle in Live View
  if (target.matches('input[type="checkbox"]')) {
    const checkbox = target as HTMLInputElement
    const isChecked = checkbox.checked
    const li = checkbox.closest('li')
    if (li) {
      let taskText = li.textContent?.trim() || ''
      taskText = taskText.replace(/^\[[ x]\]\s*/, '').trim()
      if (taskText) {
        const unchecked = `- [ ] ${taskText}`
        const checked = `- [x] ${taskText}`
        if (isChecked && content.value.includes(unchecked)) {
          content.value = content.value.replace(unchecked, checked)
          toast.success('已勾选待办任务')
        } else if (!isChecked && content.value.includes(checked)) {
          content.value = content.value.replace(checked, unchecked)
          toast.success('已取消勾选任务')
        }
      }
    }
    return
  }

  // 3. When in full-screen preview, clicking on text directly enters edit mode
  if (viewMode.value === 'preview') {
    viewMode.value = 'edit'
    nextTick(() => {
      editorTextarea.value?.focus()
    })
  }
}

const focusEditor = () => {
  nextTick(() => {
    editorTextarea.value?.focus()
  })
}

const handleClickOutside = (e: MouseEvent) => {
  if (codeMenuRef.value && !codeMenuRef.value.contains(e.target as Node)) {
    showCodeMenu.value = false
  }
}

const colorOptions = [
  { id: 'default', label: '默认石墨', class: 'bg-slate-400 border-slate-500' },
  { id: 'indigo', label: '深海靛紫', class: 'bg-indigo-500 border-indigo-400' },
  { id: 'emerald', label: '翡翠葱绿', class: 'bg-emerald-500 border-emerald-400' },
  { id: 'amber', label: '日落暖橙', class: 'bg-amber-500 border-amber-400' },
  { id: 'rose', label: '樱花玫瑰', class: 'bg-rose-500 border-rose-400' },
  { id: 'cyan', label: '极光霓青', class: 'bg-cyan-500 border-cyan-400' },
  { id: 'purple', label: '星河梦幻', class: 'bg-purple-500 border-purple-400' }
]


const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
  if (!editorTextarea.value) return
  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end) || defaultText

  const replacement = before + selectedText + after
  content.value = content.value.substring(0, start) + replacement + content.value.substring(end)

  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
  }, 50)
}

const insertTimestamp = () => {
  const now = new Date()
  const dateStr = `> 🕒 记录于 ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}\n\n`
  insertMarkdown(dateStr)
}

const handleSave = () => {
  if (!title.value.trim() || title.value.trim().startsWith('```')) {
    title.value = extractCleanTitle(title.value.trim() ? title.value : content.value)
  }

  const payload = {
    id: props.memo?.id,
    title: title.value.trim(),
    content: content.value,
    folder: isAddingFolder.value && newFolderInput.value.trim() ? newFolderInput.value.trim() : folder.value,
    note_type: noteType.value,
    color: color.value,
    tags: tagList.value.join(','),
    is_pinned: isPinned.value,
    is_favorite: isFavorite.value
  }

  emit('save', payload)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.show) return
  if (e.key === 'Escape') {
    if (showCodeMenu.value) {
      e.preventDefault()
      e.stopPropagation()
      showCodeMenu.value = false
      return
    }
    emit('close')
  } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleClickOutside)
})

</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
    <div 
      class="relative w-full h-full md:max-w-5xl md:h-[88vh] bg-[#12141a] border-0 md:border md:border-white/15 rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white/90"
      @click.stop
    >
      <!-- Row 1: Primary Header Toolbar -->
      <div class="px-3.5 md:px-6 py-2.5 md:py-3.5 border-b border-white/10 flex items-center justify-between gap-2 md:gap-4 bg-white/[0.02] shrink-0">
        <!-- Left: Close & Folder Selection -->
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <!-- Mobile Close Button -->
          <button 
            @click="emit('close')"
            class="p-1.5 md:hidden rounded-xl bg-white/10 hover:bg-white/15 text-white/80 border border-white/10 shrink-0 transition-colors cursor-pointer"
            title="返回 / 关闭"
          >
            <X :size="16" />
          </button>

          <!-- Folder Selection Pill -->
          <div class="flex items-center gap-1.5 min-w-0">
            <Layers :size="13" class="text-white/40 hidden sm:inline shrink-0" />
            <div v-if="!isAddingFolder" class="flex items-center gap-1 min-w-0">
              <div class="relative inline-flex items-center max-w-[150px] sm:max-w-[200px]">
                <select 
                  v-model="folder"
                  @change="handleFolderSelect"
                  class="appearance-none pl-2.5 pr-6 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500/50 cursor-pointer text-xs truncate"
                >
                  <option v-for="f in allFolders" :key="f" :value="f" class="bg-[#181b26] text-white">{{ f }}</option>
                  <option value="__new__" class="bg-[#181b26] text-purple-300">+ 新建分类...</option>
                </select>
                <ChevronDown :size="11" class="absolute right-2 pointer-events-none opacity-50 text-white/60" />
              </div>
              <button 
                @click="startAddingFolder" 
                class="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                title="新建分类"
              >
                <Plus :size="12" />
              </button>
            </div>

            <!-- Inline New Folder Input -->
            <div v-else class="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
              <input 
                ref="newFolderInputRef"
                v-model="newFolderInput" 
                @keydown.enter.prevent="confirmNewFolder"
                @keydown.esc.prevent="cancelNewFolder"
                placeholder="新分类名" 
                class="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/50 rounded-lg text-white text-xs focus:outline-none placeholder-white/40 w-28 sm:w-36"
              />
              <button 
                @click="confirmNewFolder" 
                class="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs"
                title="确定"
              >
                <Check :size="12" />
              </button>
              <button 
                @click="cancelNewFolder" 
                class="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
                title="取消"
              >
                <X :size="12" />
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Pin, Favorite, View Switcher & Save Button -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <!-- Pin & Star -->
          <button 
            @click="isPinned = !isPinned"
            class="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer"
            :class="isPinned ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'"
            title="置顶"
          >
            <Pin :size="14" :class="{ 'fill-amber-400': isPinned }" />
          </button>
          <button 
            @click="isFavorite = !isFavorite"
            class="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer"
            :class="isFavorite ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'"
            title="收藏"
          >
            <Star :size="14" :class="{ 'fill-amber-400': isFavorite }" />
          </button>

          <!-- Mobile View Switcher (2-Way: Edit ⇄ Preview) -->
          <div class="md:hidden flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-xs">
            <button 
              @click="viewMode = 'edit'; focusEditor()"
              class="px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium"
              :class="viewMode === 'edit' ? 'bg-purple-600 text-white font-bold shadow' : 'text-white/50'"
            >
              <Edit3 :size="12" />
              <span>编辑</span>
            </button>
            <button 
              @click="viewMode = 'preview'"
              class="px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium"
              :class="viewMode === 'preview' || viewMode === 'split' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-white/50'"
            >
              <Sparkles :size="12" />
              <span>预览</span>
            </button>
          </div>

          <!-- Desktop View Switcher (3-Way: Split / Edit / Preview) -->
          <div class="hidden md:flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-medium">
            <button 
              @click="viewMode = 'split'"
              class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              :class="viewMode === 'split' ? 'bg-indigo-600 text-white font-bold shadow ring-1 ring-indigo-400' : 'text-white/40 hover:text-white'"
              title="双栏分屏：左侧编辑输入，右侧实时解析对照"
            >
              <Columns :size="13" />
              <span>双栏分屏</span>
            </button>
            <button 
              @click="viewMode = 'edit'; focusEditor()"
              class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              :class="viewMode === 'edit' ? 'bg-purple-600 text-white font-bold shadow ring-1 ring-purple-400' : 'text-white/40 hover:text-white'"
              title="单栏编辑：全宽直接输入与修改文字"
            >
              <Edit3 :size="13" />
              <span>单栏编辑</span>
            </button>
            <button 
              @click="viewMode = 'preview'"
              class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              :class="viewMode === 'preview' ? 'bg-indigo-600 text-white font-bold shadow ring-1 ring-indigo-400' : 'text-white/40 hover:text-white'"
              title="全屏预览：查看最终排版渲染效果（点击正文即可切换回编辑）"
            >
              <Sparkles :size="13" />
              <span>全屏预览</span>
            </button>
          </div>

          <!-- Save Button -->
          <button 
            @click="handleSave"
            class="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Save :size="13" />
            <span class="hidden sm:inline">保存 (⌘S)</span>
            <span class="sm:hidden">保存</span>
          </button>

          <!-- Desktop Close Button -->
          <button 
            @click="emit('close')"
            class="hidden md:flex px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-300 border border-white/10 hover:border-red-500/40 transition-all items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 ml-1"
            title="关闭窗口 (Esc)"
          >
            <X :size="14" />
            <span>关闭</span>
          </button>
        </div>
      </div>

      <!-- Row 2: Subheader (Type Selector & Color Palette & Tags Horizontal Scrollbar) -->
      <div class="px-3.5 md:px-6 py-2 border-b border-white/5 bg-white/[0.01] flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0 text-xs">
        <div class="flex items-center gap-3 shrink-0">
          <!-- Type Switcher Pills -->
          <div class="flex items-center gap-1 bg-white/5 p-0.5 sm:p-1 rounded-xl border border-white/10 shrink-0">
            <button 
              @click="noteType = 'markdown'"
              class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0"
              :class="noteType === 'markdown' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-white/50 hover:text-white'"
            >
              <FileText :size="11" />
              <span>笔记</span>
            </button>
            <button 
              @click="noteType = 'memory'"
              class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0"
              :class="noteType === 'memory' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-white/50 hover:text-white'"
            >
              <Brain :size="11" />
              <span>记忆</span>
            </button>
            <button 
              @click="noteType = 'journal'"
              class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0"
              :class="noteType === 'journal' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-white/50 hover:text-white'"
            >
              <Calendar :size="11" />
              <span>日志</span>
            </button>
            <button 
              @click="noteType = 'todo'"
              class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0"
              :class="noteType === 'todo' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-white/50 hover:text-white'"
            >
              <CheckSquare :size="11" />
              <span>待办</span>
            </button>
            <button 
              @click="noteType = 'fleeting'"
              class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0"
              :class="noteType === 'fleeting' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-white/50 hover:text-white'"
            >
              <Sparkles :size="11" />
              <span>灵感</span>
            </button>
          </div>

          <!-- Color Accent Picker -->
          <div class="flex items-center gap-1.5 pl-2 border-l border-white/10 shrink-0">
            <button 
              v-for="c in colorOptions" 
              :key="c.id"
              @click="color = c.id as any"
              class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border transition-transform hover:scale-125 relative cursor-pointer shrink-0"
              :class="[c.class, color === c.id ? 'ring-2 ring-white scale-110' : 'opacity-70']"
              :title="c.label"
            ></button>
          </div>
        </div>

        <!-- Tags Row -->
        <div class="flex items-center gap-1.5 shrink-0">
          <TagIcon :size="12" class="text-white/40 shrink-0" />
          <div 
            v-for="t in tagList" 
            :key="t"
            class="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 text-[10px] sm:text-[11px] font-mono shrink-0"
          >
            <span>#{{ t }}</span>
            <button 
              @click="removeTag(t)" 
              class="text-purple-300/60 hover:text-red-400 p-0.5 rounded hover:bg-white/10"
            >
              <X :size="10" />
            </button>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <input 
              v-model="newTagInput" 
              @keydown="handleTagKeydown"
              placeholder="+ 标签" 
              class="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-white text-[11px] focus:outline-none placeholder-white/30 w-16 sm:w-20"
            />
          </div>
        </div>
      </div>

      <!-- Title Input Field -->
      <div class="px-3.5 md:px-6 py-2.5 md:py-3 border-b border-white/5 bg-transparent shrink-0">
        <input 
          v-model="title" 
          placeholder="输入备忘标题 / 关键主题..."
          class="w-full text-base sm:text-lg md:text-xl font-bold bg-transparent text-white placeholder-white/30 focus:outline-none tracking-wide"
        />
      </div>

      <!-- Markdown Quick Formatting Toolbar (Horizontal Scroll) -->
      <div class="px-3.5 md:px-6 py-1.5 md:py-2 border-b border-white/5 flex items-center gap-1.5 text-white/50 relative z-30 overflow-x-auto no-scrollbar shrink-0">
        <button @click="insertMarkdown('**', '**', '加粗文字')" class="p-1.5 rounded hover:bg-white/10 hover:text-white shrink-0" title="加粗">
          <Bold :size="14" />
        </button>
        <button @click="insertMarkdown('*', '*', '斜体文字')" class="p-1.5 rounded hover:bg-white/10 hover:text-white shrink-0" title="斜体">
          <Italic :size="14" />
        </button>

        <!-- Code Block Language Dropdown -->
        <div class="relative inline-flex items-center shrink-0" ref="codeMenuRef">
          <div 
            v-if="showCodeMenu" 
            class="fixed inset-0 z-40 bg-transparent cursor-default" 
            @click.stop="showCodeMenu = false"
          ></div>

          <div 
            class="inline-flex items-center rounded-lg border transition-all shadow-sm overflow-hidden shrink-0"
            :class="currentCodeLang 
              ? 'bg-purple-600/25 border-purple-500/50 text-purple-200' 
              : 'border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10'"
          >
            <button 
              @click.stop="showCodeMenu = !showCodeMenu" 
              class="px-2 py-1 flex items-center gap-1 text-xs cursor-pointer hover:text-white"
              :class="currentCodeLang ? 'font-semibold' : ''"
              title="代码格式"
            >
              <Code2 :size="13" :class="currentCodeLang ? 'text-purple-300' : 'text-white/60'" />
              <span>{{ currentCodeLang ? `格式: ${getLangLabel(currentCodeLang)}` : '代码块格式' }}</span>
              <ChevronDown :size="10" class="opacity-60 ml-0.5" />
            </button>
            <button 
              v-if="currentCodeLang"
              @click.stop="removeCodeBlock"
              class="px-1.5 py-1 hover:bg-purple-500/30 text-purple-300 hover:text-white transition-colors cursor-pointer border-l border-purple-500/30"
              title="取消代码块"
            >
              <X :size="11" />
            </button>
          </div>

          <!-- Dropdown Language Menu -->
          <div 
            v-if="showCodeMenu" 
            class="absolute top-full left-0 mt-1.5 w-60 bg-[#181b26] border border-white/15 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
          >
            <div class="px-2 py-1 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5 mb-1.5 flex items-center justify-between">
              <span>选择代码/配置语言</span>
              <button 
                @click.stop="showCodeMenu = false"
                class="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
              >
                <X :size="12" />
              </button>
            </div>

            <button 
              @click="removeCodeBlock"
              class="w-full px-2 py-1.5 mb-1 rounded-lg text-xs text-left flex items-center justify-between transition-colors border border-dashed border-white/10 hover:border-white/25 hover:bg-white/5 text-white/70 hover:text-white"
            >
              <div class="flex items-center gap-2">
                <FileText :size="12" class="text-white/40" />
                <span>纯普通文本 (清除代码块)</span>
              </div>
            </button>

            <div class="max-h-52 overflow-y-auto space-y-0.5 pr-1">
              <button 
                v-for="l in codeLanguages" 
                :key="l.value"
                @click="applyCodeLanguage(l.value)"
                class="w-full px-2 py-1 rounded-lg text-xs text-left flex items-center justify-between transition-colors cursor-pointer"
                :class="currentCodeLang === l.value ? 'bg-purple-600/30 text-purple-200 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'"
              >
                <div class="flex items-center gap-2">
                  <Check v-if="currentCodeLang === l.value" :size="12" class="text-purple-400" />
                  <span :class="currentCodeLang === l.value ? '' : 'pl-4'">{{ l.label }}</span>
                </div>
                <span class="text-[10px] font-mono opacity-40">{{ l.value }}</span>
              </button>
            </div>
          </div>
        </div>

        <button @click="insertMarkdown('- [ ] ', '', '待办任务事项')" class="p-1.5 rounded hover:bg-white/10 hover:text-white shrink-0" title="任务清单">
          <CheckSquare :size="14" />
        </button>
        <button @click="insertMarkdown('- ', '', '无序列表项')" class="p-1.5 rounded hover:bg-white/10 hover:text-white shrink-0" title="列表">
          <List :size="14" />
        </button>
        <button @click="insertMarkdown('> ', '', '引用内容')" class="p-1.5 rounded hover:bg-white/10 hover:text-white shrink-0" title="引用">
          <Quote :size="14" />
        </button>
        <button @click="insertMarkdown('| 标题 1 | 标题 2 |\n| --- | --- |\n| 内容 1 | 内容 2 |\n')" class="p-1.5 rounded hover:bg-white/10 hover:text-white shrink-0" title="表格">
          <Table :size="14" />
        </button>
        <button @click="insertTimestamp" class="p-1.5 rounded hover:bg-white/10 hover:text-white flex items-center gap-1 text-xs shrink-0" title="插入时间戳">
          <Clock :size="13" />
          <span class="text-[11px] hidden sm:inline">时间戳</span>
        </button>
      </div>

      <!-- Main Body Editor & Preview Area (Fully Responsive) -->
      <div class="flex-1 flex min-h-0 overflow-hidden relative">
        <!-- Editor Textarea Pane -->
        <!-- On Mobile: Visible when viewMode is 'edit'. On Desktop: Visible in 'split' and 'edit' -->
        <div 
          v-show="(!isMobileScreen && viewMode === 'split') || viewMode === 'edit'"
          class="h-full p-4 sm:p-6 overflow-y-auto border-r border-white/5 bg-[#0e1017]"
          :class="[!isMobileScreen && viewMode === 'split' ? 'w-1/2' : 'w-full']"
        >
          <textarea 
            ref="editorTextarea"
            v-model="content"
            placeholder="开始记录你的想法、架构备忘、代码片段或任务清单... (支持标准 Markdown 语法)"
            class="w-full h-full bg-transparent text-white/90 font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder-white/20"
          ></textarea>
        </div>

        <!-- Live Rendered Preview Pane -->
        <!-- On Mobile: Visible when viewMode is 'preview' or 'split'. On Desktop: Visible in 'split' and 'preview' -->
        <div 
          v-show="(!isMobileScreen && viewMode === 'split') || viewMode === 'preview' || (isMobileScreen && viewMode === 'split')"
          class="h-full overflow-y-auto bg-black/20"
          :class="[
            !isMobileScreen && viewMode === 'split' ? 'w-1/2 p-6' : 'w-full p-4 sm:p-8 max-w-4xl mx-auto cursor-text'
          ]"
          @click="handlePreviewClick"
          :title="viewMode === 'preview' ? '点击正文任意位置即可切换为编辑输入' : ''"
        >
          <div 
            class="markdown-body prose prose-invert prose-indigo max-w-none text-white/90 text-sm leading-relaxed select-text"
            v-html="renderedMarkdown"
          ></div>
        </div>
      </div>

      <!-- Footer Status & Actions (Mobile Optimized) -->
      <div class="px-3.5 md:px-6 py-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/40 font-mono shrink-0">
        <div class="flex items-center gap-3">
          <span>{{ content.length }} 字</span>
          <span class="hidden sm:inline">{{ content.split('\n').length }} 行</span>
        </div>
        <div class="flex items-center gap-2 sm:gap-3">
          <button 
            v-if="props.memo?.id"
            @click="emit('delete', props.memo.id)"
            class="text-red-400 hover:text-red-300 flex items-center gap-1 font-sans cursor-pointer mr-2 transition-colors"
          >
            <Trash2 :size="12" />
            <span>删除备忘</span>
          </button>
          <button 
            @click="emit('close')"
            class="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-xs font-sans transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
