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
  Eye, 
  Edit3, 
  Trash2,
  List,
  Plus,
  Check,
  ChevronDown
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
const tagsInput = ref('')
const isPinned = ref(false)
const isFavorite = ref(false)
const viewMode = ref<'edit' | 'split' | 'preview'>('split')

const editorTextarea = ref<HTMLTextAreaElement | null>(null)

watch(() => props.memo, (m) => {
  if (m) {
    title.value = m.title || ''
    content.value = m.content || ''
    folder.value = m.folder || '默认备忘'
    noteType.value = m.note_type || 'markdown'
    color.value = m.color || 'default'
    tagsInput.value = m.tags || ''
    isPinned.value = !!m.is_pinned
    isFavorite.value = !!m.is_favorite
  } else {
    // New memo defaults
    title.value = ''
    content.value = ''
    folder.value = props.availableFolders[0] || '默认备忘'
    noteType.value = 'markdown'
    color.value = 'default'
    tagsInput.value = ''
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

const insertCodeBlock = (lang: string) => {
  showCodeMenu.value = false
  if (!editorTextarea.value) return
  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end)

  if (selectedText) {
    const before = `\`\`\`${lang}\n`
    const after = `\n\`\`\`\n`
    const replacement = before + selectedText + after
    content.value = content.value.substring(0, start) + replacement + content.value.substring(end)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 50)
  } else {
    const before = `\`\`\`${lang}\n`
    const after = `\n\`\`\`\n`
    const replacement = before + after
    content.value = content.value.substring(0, start) + replacement + content.value.substring(end)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length)
    }, 50)
  }
}

const wrapEntireContentAsCode = (defaultLang: string = 'properties') => {
  showCodeMenu.value = false
  const trimmed = content.value.trim()
  if (!trimmed) {
    content.value = `\`\`\`${defaultLang}\n\n\`\`\`\n`
    return
  }
  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    toast.success('当前内容已经是代码块')
    return
  }
  content.value = `\`\`\`${defaultLang}\n${trimmed}\n\`\`\`\n`
  toast.success(`已将全部内容包裹为 ${defaultLang.toUpperCase()} 代码块`)
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
    tags: tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean).join(','),
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
      <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-4 bg-white/[0.02]">
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
        <div class="flex items-center gap-2">
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

          <!-- View Mode Toggle (Edit / Split / Preview) -->
          <div class="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button 
              @click="viewMode = 'edit'"
              class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5"
              :class="viewMode === 'edit' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-white/40 hover:text-white'"
              title="纯源码编辑模式 (全宽编辑)"
            >
              <Edit3 :size="13" />
              <span>编辑</span>
            </button>
            <button 
              @click="viewMode = 'split'"
              class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5"
              :class="viewMode === 'split' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-white/40 hover:text-white'"
              title="双栏实时解析对照模式 (左编辑右预览)"
            >
              <Columns :size="13" />
              <span>分栏</span>
            </button>
            <button 
              @click="viewMode = 'preview'"
              class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5"
              :class="viewMode === 'preview' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-white/40 hover:text-white'"
              title="即时解析渲染模式 (全屏渲染)"
            >
              <Eye :size="13" />
              <span>即时预览</span>
            </button>
          </div>

          <!-- Save Button -->
          <button 
            @click="handleSave"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
          >
            <Save :size="14" />
            <span>保存 (⌘S)</span>
          </button>

          <!-- Close -->
          <button 
            @click="emit('close')"
            class="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X :size="18" />
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

          <!-- Tags Input -->
          <div class="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <TagIcon :size="13" class="text-white/40 shrink-0" />
            <input 
              v-model="tagsInput"
              type="text" 
              placeholder="添加标签 (用逗号隔开，如: 架构, 备忘, 待办)" 
              class="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
            />
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
            class="px-2 py-1 rounded-lg hover:bg-white/10 hover:text-white flex items-center gap-1 transition-colors border border-transparent hover:border-white/10 text-xs"
            :class="showCodeMenu ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : ''"
            title="插入代码块 / 选择语言格式 (JSON, HTML, Properties等)"
          >
            <Code2 :size="14" />
            <span class="text-[11px] font-mono">代码块</span>
            <ChevronDown :size="11" class="opacity-60" />
          </button>

          <!-- Dropdown Language Menu -->
          <div 
            v-if="showCodeMenu" 
            class="absolute top-full left-0 mt-1.5 w-60 bg-[#161922] border border-white/15 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
          >
            <div class="px-2 py-1 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5 mb-1 flex items-center justify-between">
              <span>选择代码/配置语言</span>
              <span class="text-[9px] font-mono text-indigo-400">```lang</span>
            </div>
            <div class="max-h-52 overflow-y-auto space-y-0.5 pr-1">
              <button 
                v-for="l in codeLanguages" 
                :key="l.value"
                @click="insertCodeBlock(l.value)"
                class="w-full px-2.5 py-1.5 rounded-lg text-xs text-left text-white/80 hover:text-white hover:bg-indigo-600/30 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <span>{{ l.label }}</span>
                <span class="text-[10px] font-mono text-white/30 group-hover:text-indigo-300">{{ l.value }}</span>
              </button>
            </div>
            <div class="pt-1.5 mt-1 border-t border-white/5 space-y-1">
              <button 
                @click="wrapEntireContentAsCode('properties')"
                class="w-full px-2 py-1 rounded-md text-[11px] text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/20 text-left transition-colors flex items-center justify-between"
              >
                <span>⚡ 全文转为配置代码块</span>
                <span class="font-mono text-[10px] opacity-60">properties</span>
              </button>
              <button 
                @click="wrapEntireContentAsCode('json')"
                class="w-full px-2 py-1 rounded-md text-[11px] text-purple-300 hover:text-purple-200 hover:bg-purple-500/20 text-left transition-colors flex items-center justify-between"
              >
                <span>⚡ 全文转为 JSON 代码块</span>
                <span class="font-mono text-[10px] opacity-60">json</span>
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
      <div class="flex-1 flex min-h-0 overflow-hidden">
        <!-- Editor Textarea -->
        <div 
          v-show="viewMode !== 'preview'"
          class="flex-1 h-full p-6 overflow-y-auto border-r border-white/5"
        >
          <textarea 
            ref="editorTextarea"
            v-model="content"
            placeholder="开始记录你的想法、架构备忘、代码片段或任务清单... (支持标准 Markdown 语法)"
            class="w-full h-full bg-transparent text-white/90 font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder-white/20"
          ></textarea>
        </div>

        <!-- Live Markdown Preview (Click to copy code blocks) -->
        <div 
          v-show="viewMode !== 'edit'"
          class="flex-1 h-full p-6 overflow-y-auto bg-black/20"
          @click="copyCodeFromClick"
        >
          <div 
            class="markdown-body prose prose-invert prose-indigo max-w-none text-white/90 text-sm leading-relaxed"
            v-html="renderedMarkdown"
          ></div>
        </div>
      </div>

      <!-- Footer Status -->
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
            class="text-red-400 hover:text-red-300 flex items-center gap-1 font-sans"
          >
            <Trash2 :size="12" />
            <span>删除备忘</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
