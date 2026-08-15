<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { 
  Plus, 
  Search, 
  Save, 
  Pin, 
  Star, 
  Bold, 
  Italic, 
  Code2, 
  CheckSquare, 
  Quote, 
  Table, 
  Columns, 
  Eye, 
  Edit3,
  Check,
  X,
  ChevronDown
} from 'lucide-vue-next'
import { renderMarkdown, copyCodeFromClick } from '../../utils/markdown'
import { useToast } from '../../composables/useToast'

const toast = useToast()

const props = defineProps<{
  memos: any[],
  availableFolders: string[]
}>()

const emit = defineEmits(['save', 'delete', 'toggle-pin', 'toggle-favorite', 'create-new'])

const selectedId = ref<number | null>(null)
const searchQuery = ref('')
const selectedTypeFilter = ref('all')

const currentTitle = ref('')
const currentContent = ref('')
const currentFolder = ref('默认备忘')
const customFolders = ref<string[]>([])
const newFolderInput = ref('')
const newFolderInputRef = ref<HTMLInputElement | null>(null)
const isAddingFolder = ref(false)
const previousFolder = ref('')

const allFolders = computed(() => {
  const set = new Set([...props.availableFolders, ...customFolders.value])
  if (currentFolder.value && currentFolder.value !== '__new__') {
    set.add(currentFolder.value)
  }
  return Array.from(set).filter(Boolean)
})

const startAddingFolder = () => {
  previousFolder.value = currentFolder.value !== '__new__' ? currentFolder.value : (allFolders.value[0] || '默认备忘')
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
    currentFolder.value = trimmed
    handleContentChange()
  } else if (previousFolder.value) {
    currentFolder.value = previousFolder.value
  }
  isAddingFolder.value = false
}

const cancelNewFolder = () => {
  if (previousFolder.value && previousFolder.value !== '__new__') {
    currentFolder.value = previousFolder.value
  } else {
    currentFolder.value = allFolders.value[0] || '默认备忘'
  }
  isAddingFolder.value = false
}

const handleFolderSelect = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  if (val === '__new__') {
    startAddingFolder()
  } else {
    handleContentChange()
  }
}
const currentColor = ref('default')
const currentTags = ref('')
const currentIsPinned = ref(false)
const currentIsFavorite = ref(false)
const currentNoteType = ref('markdown')
const viewMode = ref<'edit' | 'split' | 'preview'>('split')
const editorTextarea = ref<HTMLTextAreaElement | null>(null)
const isSaved = ref(true)

const filteredMemos = computed(() => {
  let list = props.memos
  if (selectedTypeFilter.value !== 'all') {
    list = list.filter(m => m.note_type === selectedTypeFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.content.toLowerCase().includes(q) || 
      (m.tags && m.tags.toLowerCase().includes(q))
    )
  }
  return list
})

const selectedMemo = computed(() => {
  return props.memos.find(m => m.id === selectedId.value) || filteredMemos.value[0] || null
})

watch(selectedMemo, (m) => {
  if (m) {
    selectedId.value = m.id
    currentTitle.value = m.title || ''
    currentContent.value = m.content || ''
    currentFolder.value = m.folder || '默认备忘'
    currentColor.value = m.color || 'default'
    currentTags.value = m.tags || ''
    currentIsPinned.value = !!m.is_pinned
    currentIsFavorite.value = !!m.is_favorite
    currentNoteType.value = m.note_type || 'markdown'
    isSaved.value = true
  }
}, { immediate: true })

const handleContentChange = () => {
  isSaved.value = false
}

const handleSaveCurrent = () => {
  if (!selectedId.value && !currentTitle.value.trim() && !currentContent.value.trim()) return

  emit('save', {
    id: selectedId.value,
    title: currentTitle.value.trim() || '未命名备忘',
    content: currentContent.value,
    folder: currentFolder.value,
    note_type: currentNoteType.value,
    color: currentColor.value,
    tags: currentTags.value,
    is_pinned: currentIsPinned.value,
    is_favorite: currentIsFavorite.value
  })
  isSaved.value = true
}

const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
  if (!editorTextarea.value) return
  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = currentContent.value.substring(start, end) || defaultText

  const replacement = before + selectedText + after
  currentContent.value = currentContent.value.substring(0, start) + replacement + currentContent.value.substring(end)
  isSaved.value = false

  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
  }, 50)
}

const renderedMarkdown = computed(() => {
  return renderMarkdown(currentContent.value || '*暂无内容*')
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
  const trimmed = currentContent.value.trim()
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

  if (viewMode.value === 'preview') {
    viewMode.value = 'split'
  }

  const trimmed = currentContent.value.trim()

  // 1. If content is already wrapped in a code block, replace its language header!
  const fullBlockMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n?```$/)
  if (fullBlockMatch) {
    const innerCode = fullBlockMatch[2]
    currentContent.value = `\`\`\`${lang}\n${innerCode}\n\`\`\`\n`
    isSaved.value = false
    toast.success(`已切换代码语言为: ${lang.toUpperCase()}`)
    return
  }

  // 2. If user has text selected in textarea, wrap that selection
  if (editorTextarea.value) {
    const textarea = editorTextarea.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = currentContent.value.substring(start, end)

    if (selectedText) {
      const selMatch = selectedText.trim().match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n?```$/)
      let replacement = ''
      if (selMatch) {
        replacement = `\`\`\`${lang}\n${selMatch[2]}\n\`\`\`\n`
      } else {
        replacement = `\`\`\`${lang}\n${selectedText}\n\`\`\`\n`
      }
      currentContent.value = currentContent.value.substring(0, start) + replacement + currentContent.value.substring(end)
      isSaved.value = false
      toast.success(`已将选中文本转为: ${lang.toUpperCase()}`)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + lang.length + 4, start + replacement.length - 4)
      }, 50)
      return
    }
  }

  // 3. If content is not empty and doesn't have code block, wrap entire content
  if (trimmed) {
    currentContent.value = `\`\`\`${lang}\n${trimmed}\n\`\`\`\n`
    isSaved.value = false
    toast.success(`已将全文包裹为: ${lang.toUpperCase()}`)
    return
  }

  // 4. If content is empty, insert empty code template
  const template = `\`\`\`${lang}\n\n\`\`\`\n`
  currentContent.value = template
  isSaved.value = false
  toast.success(`已插入 ${lang.toUpperCase()} 代码块`)
  setTimeout(() => {
    if (editorTextarea.value) {
      editorTextarea.value.focus()
      editorTextarea.value.setSelectionRange(lang.length + 4, lang.length + 4)
    }
  }, 50)
}

const handleClickOutside = (e: MouseEvent) => {
  if (codeMenuRef.value && !codeMenuRef.value.contains(e.target as Node)) {
    showCodeMenu.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="h-[calc(100vh-14rem)] flex rounded-2xl border border-white/10 overflow-hidden bg-[#111319] shadow-2xl">
    <!-- Left Memo List Pane -->
    <div class="w-80 border-r border-white/10 flex flex-col bg-white/[0.01]">
      <!-- Header Search & Create -->
      <div class="p-3 border-b border-white/5 space-y-2">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索备忘..." 
              class="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <button 
            @click="emit('create-new')"
            class="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
            title="新建备忘"
          >
            <Plus :size="15" />
          </button>
        </div>
      </div>

      <!-- Scrollable List -->
      <div class="flex-1 overflow-y-auto divide-y divide-white/5">
        <div 
          v-for="memo in filteredMemos" 
          :key="memo.id"
          @click="selectedId = memo.id"
          class="p-3 cursor-pointer transition-all hover:bg-white/[0.04] flex flex-col gap-1"
          :class="selectedId === memo.id ? 'bg-indigo-600/15 border-l-2 border-indigo-500' : ''"
        >
          <div class="flex items-center justify-between gap-1 text-[10px] text-white/40">
            <span class="px-1.5 py-0.5 rounded bg-white/5 font-mono">{{ memo.folder }}</span>
            <div class="flex items-center gap-1 font-mono">
              <Pin v-if="memo.is_pinned" :size="10" class="text-amber-400 fill-amber-400" />
              <Star v-if="memo.is_favorite" :size="10" class="text-amber-400 fill-amber-400" />
              <span>{{ memo.updated_at?.split(' ')[0] }}</span>
            </div>
          </div>
          <h4 class="text-xs font-bold text-white/90 truncate">
            {{ memo.title || '无标题' }}
          </h4>
          <p class="text-[11px] text-white/50 truncate font-sans">
            {{ memo.content?.slice(0, 50) || '无内容' }}
          </p>
        </div>

        <div v-if="!filteredMemos.length" class="text-center py-8 text-white/40 text-xs">
          无匹配备忘
        </div>
      </div>
    </div>

    <!-- Right Editor & Preview Pane -->
    <div class="flex-1 flex flex-col min-w-0 bg-[#0e1017]">
      <div v-if="selectedMemo" class="flex flex-col h-full">
        <!-- Top Toolbar -->
        <div class="px-6 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-3 bg-white/[0.02]">
          <div class="flex items-center gap-2 flex-1">
            <!-- Folder Select & Create -->
            <div v-if="!isAddingFolder" class="flex items-center gap-1">
              <select 
                v-model="currentFolder"
                @change="handleFolderSelect"
                class="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none cursor-pointer"
              >
                <option v-for="f in allFolders" :key="f" :value="f">{{ f }}</option>
                <option value="__new__">+ 新建分类...</option>
              </select>
              <button 
                @click="startAddingFolder" 
                class="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white border border-white/10 transition-colors"
                title="新建分类"
              >
                <Plus :size="12" />
              </button>
            </div>

            <!-- Inline Folder Input -->
            <div v-else class="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
              <input 
                ref="newFolderInputRef"
                v-model="newFolderInput" 
                @keydown.enter.prevent="confirmNewFolder"
                @keydown.esc.prevent="cancelNewFolder"
                placeholder="输入新分类名称..." 
                class="px-2 py-1 bg-purple-500/10 border border-purple-500/50 rounded-lg text-white text-xs focus:outline-none w-36"
              />
              <button 
                @click="confirmNewFolder" 
                class="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-0.5"
                title="确定"
              >
                <Check :size="11" />
                <span>确定</span>
              </button>
              <button 
                @click="cancelNewFolder" 
                class="p-1 text-white/40 hover:text-white rounded hover:bg-white/10"
                title="取消"
              >
                <X :size="12" />
              </button>
            </div>

            <select 
              v-model="currentNoteType"
              @change="handleContentChange"
              class="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/80 focus:outline-none"
            >
              <option value="markdown">📝 Markdown 笔记</option>
              <option value="memory">🧠 个人/项目记忆</option>
              <option value="journal">📅 工作日志</option>
              <option value="todo">✅ 待办清单</option>
              <option value="fleeting">⚡ 闪念胶囊</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-mono" :class="isSaved ? 'text-emerald-400' : 'text-amber-400'">
              {{ isSaved ? '✓ 已自动保存' : '● 未保存修改' }}
            </span>

            <button 
              @click="currentIsPinned = !currentIsPinned; handleSaveCurrent()"
              class="p-1.5 rounded-lg border text-xs transition-colors"
              :class="currentIsPinned ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/40'"
              title="置顶"
            >
              <Pin :size="13" :class="{ 'fill-amber-400': currentIsPinned }" />
            </button>

            <button 
              @click="currentIsFavorite = !currentIsFavorite; handleSaveCurrent()"
              class="p-1.5 rounded-lg border text-xs transition-colors"
              :class="currentIsFavorite ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-white/40'"
              title="收藏"
            >
              <Star :size="13" :class="{ 'fill-amber-400': currentIsFavorite }" />
            </button>

            <!-- Mode View -->
            <div class="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/10">
              <button 
                @click="viewMode = 'edit'"
                class="p-1 rounded transition-colors"
                :class="viewMode === 'edit' ? 'bg-white/15 text-white' : 'text-white/40'"
              >
                <Edit3 :size="13" />
              </button>
              <button 
                @click="viewMode = 'split'"
                class="p-1 rounded transition-colors"
                :class="viewMode === 'split' ? 'bg-white/15 text-white' : 'text-white/40'"
              >
                <Columns :size="13" />
              </button>
              <button 
                @click="viewMode = 'preview'"
                class="p-1 rounded transition-colors"
                :class="viewMode === 'preview' ? 'bg-white/15 text-white' : 'text-white/40'"
              >
                <Eye :size="13" />
              </button>
            </div>

            <button 
              @click="handleSaveCurrent"
              class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow"
            >
              <Save :size="13" />
              <span>保存</span>
            </button>
          </div>
        </div>

        <!-- Title Row -->
        <div class="px-6 py-2 border-b border-white/5">
          <input 
            v-model="currentTitle"
            @input="handleContentChange"
            placeholder="输入备忘标题..." 
            class="w-full text-lg font-bold bg-transparent text-white placeholder-white/20 focus:outline-none"
          />
        </div>

        <!-- Formatting Bar -->
        <div class="px-6 py-1.5 border-b border-white/5 flex items-center gap-1.5 text-white/40 text-xs relative z-30 overflow-visible">
          <button @click="insertMarkdown('**', '**', '粗体')" class="p-1 hover:text-white" title="加粗"><Bold :size="13" /></button>
          <button @click="insertMarkdown('*', '*', '斜体')" class="p-1 hover:text-white" title="斜体"><Italic :size="13" /></button>
          
          <!-- Code Block Dropdown -->
          <div class="relative inline-flex items-center" ref="codeMenuRef">
            <button 
              @click.stop="showCodeMenu = !showCodeMenu"
              class="px-2 py-0.5 rounded-lg hover:bg-white/10 hover:text-white flex items-center gap-1 transition-colors text-xs cursor-pointer border"
              :class="currentCodeLang 
                ? 'bg-purple-600/25 border-purple-500/50 text-purple-200 font-semibold' 
                : 'border-white/10 text-white/60 hover:border-white/20'"
              title="切换/插入代码块语言格式"
            >
              <Code2 :size="13" :class="currentCodeLang ? 'text-purple-300' : 'text-white/60'" />
              <span>{{ currentCodeLang ? `格式: ${getLangLabel(currentCodeLang)}` : '代码块格式' }}</span>
              <ChevronDown :size="10" class="opacity-60 ml-0.5" />
            </button>

            <!-- Dropdown Language Menu -->
            <div 
              v-if="showCodeMenu" 
              class="absolute top-full left-0 mt-1.5 w-60 bg-[#181b26] border border-white/15 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
            >
              <div class="px-2 py-1 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5 mb-1.5 flex items-center justify-between">
                <span>选择代码/配置语言</span>
                <span class="text-[9px] font-mono text-purple-400">```lang</span>
              </div>
              <div class="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                <button 
                  v-for="l in codeLanguages" 
                  :key="l.value"
                  @click="applyCodeLanguage(l.value)"
                  class="w-full px-2 py-1.5 rounded-lg text-xs text-left flex items-center justify-between transition-colors group cursor-pointer"
                  :class="currentCodeLang === l.value ? 'bg-purple-600/30 text-purple-200 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'"
                >
                  <div class="flex items-center gap-2">
                    <Check v-if="currentCodeLang === l.value" :size="12" class="text-purple-400 shrink-0" />
                    <span :class="currentCodeLang === l.value ? '' : 'pl-4'">{{ l.label }}</span>
                  </div>
                  <span class="text-[10px] font-mono opacity-40 group-hover:opacity-100 group-hover:text-purple-300">{{ l.value }}</span>
                </button>
              </div>
            </div>
          </div>

          <button @click="insertMarkdown('- [ ] ', '', '任务')" class="p-1 hover:text-white" title="待办清单"><CheckSquare :size="13" /></button>
          <button @click="insertMarkdown('> ', '', '引用')" class="p-1 hover:text-white" title="引用"><Quote :size="13" /></button>
          <button @click="insertMarkdown('| 标头 | 标头 |\n|---|---|\n| 内容 | 内容 |\n')" class="p-1 hover:text-white" title="表格"><Table :size="13" /></button>
        </div>

        <!-- Editor Content Area -->
        <div class="flex-1 flex min-h-0 overflow-hidden">
          <div 
            v-show="viewMode !== 'preview'"
            class="flex-1 h-full p-6 overflow-y-auto border-r border-white/5"
          >
            <textarea 
              ref="editorTextarea"
              v-model="currentContent"
              @input="handleContentChange"
              placeholder="在此输入 Markdown 正文..."
              class="w-full h-full bg-transparent text-white/90 font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder-white/20"
            ></textarea>
          </div>

          <div 
            v-show="viewMode !== 'edit'"
            class="flex-1 h-full p-6 overflow-y-auto bg-black/20"
            @click="copyCodeFromClick"
          >
            <div 
              class="markdown-body prose prose-invert prose-indigo max-w-none text-white/90 text-xs leading-relaxed"
              v-html="renderedMarkdown"
            ></div>
          </div>
        </div>
      </div>

      <div v-else class="flex-1 flex flex-col items-center justify-center text-white/30 text-xs space-y-2">
        <Edit3 :size="32" class="opacity-30" />
        <span>选择或新建一篇备忘开始编辑</span>
      </div>
    </div>
  </div>
</template>
