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
  Sparkles
} from 'lucide-vue-next'
import { renderMarkdown, copyCodeFromClick } from '../../utils/markdown'
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
const viewMode = ref<'split' | 'preview' | 'edit'>('split')

const editorTextarea = ref<HTMLTextAreaElement | null>(null)

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
  const item = codeLanguages.find(l => l.value === val)
  return item ? item.label.split(' ')[0] : val.toUpperCase()
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
  { id: 'default', label: '默认石墨', class: 'bg-white/15 border-white/30' },
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
  if (!title.value.trim()) {
    title.value = content.value.slice(0, 30).trim() || '未命名备忘'
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
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    handleSave()
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
    <div 
      class="relative w-full max-w-5xl h-[88vh] bg-[#12141a] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white/90"
      @click.stop
    >
      <!-- Top Header Toolbar -->
      <div class="px-6 py-3.5 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.02] shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              @click="noteType = 'markdown'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'markdown' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50 hover:text-white'"
            >
              📝 笔记
            </button>
            <button 
              @click="noteType = 'memory'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'memory' ? 'bg-purple-600 text-white font-bold shadow' : 'text-white/50 hover:text-white'"
            >
              🧠 记忆
            </button>
            <button 
              @click="noteType = 'journal'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'journal' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50 hover:text-white'"
            >
              📅 日志
            </button>
            <button 
              @click="noteType = 'todo'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'todo' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50 hover:text-white'"
            >
              ✅ 待办
            </button>
            <button 
              @click="noteType = 'fleeting'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'fleeting' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50 hover:text-white'"
            >
              ⚡ 灵感
            </button>
          </div>

          <!-- Color Accent Picker -->
          <div class="flex items-center gap-1.5 pl-2 border-l border-white/10">
            <button 
              v-for="c in colorOptions" 
              :key="c.id"
              @click="color = c.id as any"
              class="w-4 h-4 rounded-full border transition-transform hover:scale-125 relative"
              :class="[c.class, color === c.id ? 'ring-2 ring-white scale-110' : 'opacity-70']"
              :title="c.label"
            ></button>
          </div>
        </div>

        <!-- Right Action Controls -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Pin & Star -->
          <button 
            @click="isPinned = !isPinned"
            class="p-2 rounded-xl border transition-all"
            :class="isPinned ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'"
            title="置顶"
          >
            <Pin :size="15" :class="{ 'fill-amber-400': isPinned }" />
          </button>
          <button 
            @click="isFavorite = !isFavorite"
            class="p-2 rounded-xl border transition-all"
            :class="isFavorite ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'"
            title="收藏"
          >
            <Star :size="15" :class="{ 'fill-amber-400': isFavorite }" />
          </button>

          <!-- View Mode Switcher (Split / Edit / Preview) -->
          <div class="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-medium">
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
            class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Save :size="14" />
            <span>保存 (⌘S)</span>
          </button>

          <!-- Close Button -->
          <button 
            @click="emit('close')"
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-300 border border-white/10 hover:border-red-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 ml-1"
            title="关闭窗口 (Esc)"
          >
            <X :size="15" />
            <span>关闭</span>
          </button>
        </div>
      </div>

      <!-- Metadata Config Row (Folder & Tags) -->
      <div class="px-6 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between flex-wrap gap-4 text-xs">
        <div class="flex items-center gap-4 flex-1">
          <!-- Folder Selection -->
          <div class="flex items-center gap-1.5">
            <Layers :size="13" class="text-white/40" />
            <span class="text-white/50 font-medium">分类:</span>
            
            <div v-if="!isAddingFolder" class="flex items-center gap-1">
              <select 
                v-model="folder"
                @change="handleFolderSelect"
                class="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option v-for="f in allFolders" :key="f" :value="f">{{ f }}</option>
                <option value="__new__">+ 新建分类...</option>
              </select>
              <button 
                @click="startAddingFolder" 
                class="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors"
                title="新建分类"
              >
                <Plus :size="13" />
              </button>
            </div>

            <!-- Inline New Folder Input -->
            <div v-else class="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              <input 
                ref="newFolderInputRef"
                v-model="newFolderInput" 
                @keydown.enter.prevent="confirmNewFolder"
                @keydown.esc.prevent="cancelNewFolder"
                placeholder="输入分类名称 (回车确认)" 
                class="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/50 rounded-lg text-white text-xs focus:outline-none placeholder-white/40 w-44 shadow-inner"
              />
              <button 
                @click="confirmNewFolder" 
                class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow"
                title="确认新建分类"
              >
                <Check :size="12" />
                <span>确定</span>
              </button>
              <button 
                @click="cancelNewFolder" 
                class="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="取消"
              >
                <X :size="13" />
              </button>
            </div>
          </div>

          <!-- Interactive Tags Row -->
          <div class="flex items-center gap-2 flex-1 min-w-[240px] flex-wrap">
            <TagIcon :size="13" class="text-white/40 shrink-0" />
            
            <!-- Existing Tag Badges -->
            <div 
              v-for="t in tagList" 
              :key="t"
              class="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 text-[11px] font-mono group animate-in fade-in zoom-in-95 duration-100"
            >
              <span>#{{ t }}</span>
              <button 
                @click="removeTag(t)" 
                class="text-purple-300/60 hover:text-red-400 p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="删除标签"
              >
                <X :size="10" />
              </button>
            </div>

            <!-- New Tag Input -->
            <div class="flex items-center gap-1">
              <input 
                v-model="newTagInput"
                @keydown="handleTagKeydown"
                type="text" 
                placeholder="添加标签 (回车确认)" 
                class="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 w-32"
              />
              <button 
                v-if="newTagInput.trim()"
                @click="addTag()"
                class="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer shadow transition-all"
                title="确认添加"
              >
                <Plus :size="11" />
                <span>添加</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Title Input -->
      <div class="px-6 pt-4 pb-2">
        <input 
          v-model="title"
          type="text" 
          placeholder="给这篇备忘或日志起个标题..." 
          class="w-full text-xl font-bold bg-transparent text-white placeholder-white/20 focus:outline-none border-b border-white/5 pb-2"
        />
      </div>

      <!-- Quick Markdown Action Toolbar -->
      <div class="px-6 py-2 border-b border-white/5 flex items-center gap-1.5 text-white/50 relative z-30 overflow-visible">
        <button @click="insertMarkdown('**', '**', '加粗文字')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="加粗">
          <Bold :size="14" />
        </button>
        <button @click="insertMarkdown('*', '*', '斜体文字')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="斜体">
          <Italic :size="14" />
        </button>

        <!-- Code Block Language Dropdown -->
        <div class="relative inline-flex items-center" ref="codeMenuRef">
          <button 
            @click.stop="showCodeMenu = !showCodeMenu" 
            class="px-2.5 py-1 rounded-lg hover:bg-white/10 hover:text-white flex items-center gap-1.5 transition-all border text-xs cursor-pointer shadow-sm"
            :class="currentCodeLang 
              ? 'bg-purple-600/25 border-purple-500/50 text-purple-200 font-semibold' 
              : 'border-white/10 text-white/70 hover:border-white/20'"
            title="切换/插入代码块语言格式 (JSON, Properties, YAML, HTML等)"
          >
            <Code2 :size="14" :class="currentCodeLang ? 'text-purple-300' : 'text-white/60'" />
            <span>{{ currentCodeLang ? `格式: ${getLangLabel(currentCodeLang)}` : '代码块格式' }}</span>
            <ChevronDown :size="11" class="opacity-60 ml-0.5" />
          </button>

          <!-- Dropdown Language Menu -->
          <div 
            v-if="showCodeMenu" 
            class="absolute top-full left-0 mt-1.5 w-64 bg-[#181b26] border border-white/15 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
          >
            <div class="px-2 py-1 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5 mb-1.5 flex items-center justify-between">
              <span>选择代码/配置语言</span>
              <span class="text-[9px] font-mono text-purple-400">```lang</span>
            </div>
            <div class="max-h-56 overflow-y-auto space-y-0.5 pr-1">
              <button 
                v-for="l in codeLanguages" 
                :key="l.value"
                @click="applyCodeLanguage(l.value)"
                class="w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center justify-between transition-colors group cursor-pointer"
                :class="currentCodeLang === l.value ? 'bg-purple-600/30 text-purple-200 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'"
              >
                <div class="flex items-center gap-2">
                  <Check v-if="currentCodeLang === l.value" :size="13" class="text-purple-400 shrink-0" />
                  <span :class="currentCodeLang === l.value ? '' : 'pl-5'">{{ l.label }}</span>
                </div>
                <span class="text-[10px] font-mono opacity-40 group-hover:opacity-100 group-hover:text-purple-300">{{ l.value }}</span>
              </button>
            </div>
          </div>
        </div>

        <button @click="insertMarkdown('- [ ] ', '', '代办任务项')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="待办清单">
          <CheckSquare :size="14" />
        </button>
        <button @click="insertMarkdown('- ', '', '列表项')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="无序列表">
          <List :size="14" />
        </button>
        <button @click="insertMarkdown('> ', '', '引用内容')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="引用">
          <Quote :size="14" />
        </button>
        <button @click="insertMarkdown('| 标题 1 | 标题 2 |\n| --- | --- |\n| 内容 1 | 内容 2 |\n')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="表格">
          <Table :size="14" />
        </button>
        <button @click="insertTimestamp" class="p-1.5 rounded hover:bg-white/10 hover:text-white flex items-center gap-1 text-xs" title="插入时间戳">
          <Clock :size="14" />
          <span class="text-[11px]">时间戳</span>
        </button>
      </div>

      <!-- Main Body Editor & Preview Area -->
      <div class="flex-1 flex min-h-0 overflow-hidden relative">
        <!-- Editor Textarea Pane (visible in split & edit) -->
        <div 
          v-show="viewMode === 'split' || viewMode === 'edit'"
          class="h-full p-6 overflow-y-auto border-r border-white/5 bg-[#0e1017]"
          :class="viewMode === 'split' ? 'w-1/2' : 'w-full'"
        >
          <textarea 
            ref="editorTextarea"
            v-model="content"
            placeholder="开始记录你的想法、架构备忘、代码片段或任务清单... (支持标准 Markdown 语法)"
            class="w-full h-full bg-transparent text-white/90 font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder-white/20"
          ></textarea>
        </div>

        <!-- Live Rendered Preview (visible in split & preview) -->
        <div 
          v-show="viewMode === 'split' || viewMode === 'preview'"
          class="h-full overflow-y-auto bg-black/20"
          :class="[
            viewMode === 'split' ? 'w-1/2 p-6' : 'w-full p-8 max-w-4xl mx-auto cursor-text'
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

      <!-- Footer Status & Actions -->
      <div class="px-6 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/40 font-mono">
        <div class="flex items-center gap-4">
          <span>字符数: {{ content.length }}</span>
          <span>行数: {{ content.split('\n').length }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="props.memo?.id" class="text-[11px]">更新于: {{ props.memo.updated_at }}</span>
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
