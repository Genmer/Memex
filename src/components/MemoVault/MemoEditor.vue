<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
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
  List
} from 'lucide-vue-next'

const props = defineProps<{
  show: boolean,
  memo: any | null,
  availableFolders: string[]
}>()

const emit = defineEmits(['close', 'save', 'delete'])

const title = ref('')
const content = ref('')
const folder = ref('默认备忘')
const newFolderInput = ref('')
const isAddingFolder = ref(false)
const noteType = ref<'markdown' | 'journal' | 'todo' | 'fleeting' | 'code'>('markdown')
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
  try {
    return marked.parse(content.value || '*暂无内容*')
  } catch {
    return content.value
  }
})

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
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
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
              📝 Markdown
            </button>
            <button 
              @click="noteType = 'journal'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'journal' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50 hover:text-white'"
            >
              📅 工作日志
            </button>
            <button 
              @click="noteType = 'todo'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'todo' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50 hover:text-white'"
            >
              ✅ 待办任务
            </button>
            <button 
              @click="noteType = 'fleeting'"
              class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              :class="noteType === 'fleeting' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50 hover:text-white'"
            >
              ⚡ 闪念胶囊
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

          <!-- Split Mode Toggle -->
          <div class="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              @click="viewMode = 'edit'"
              class="p-1.5 rounded-lg transition-all"
              :class="viewMode === 'edit' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'"
              title="纯编辑模式"
            >
              <Edit3 :size="14" />
            </button>
            <button 
              @click="viewMode = 'split'"
              class="p-1.5 rounded-lg transition-all"
              :class="viewMode === 'split' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'"
              title="分栏预览模式"
            >
              <Columns :size="14" />
            </button>
            <button 
              @click="viewMode = 'preview'"
              class="p-1.5 rounded-lg transition-all"
              :class="viewMode === 'preview' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'"
              title="纯预览模式"
            >
              <Eye :size="14" />
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
            <select 
              v-if="!isAddingFolder"
              v-model="folder"
              class="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option v-for="f in availableFolders" :key="f" :value="f">{{ f }}</option>
              <option value="__new__">+ 新建分类...</option>
            </select>
            <div v-else class="flex items-center gap-1">
              <input 
                v-model="newFolderInput" 
                placeholder="输入新分类名称" 
                class="px-2.5 py-1 bg-white/5 border border-indigo-500/50 rounded-lg text-white text-xs focus:outline-none"
              />
              <button @click="isAddingFolder = false" class="text-white/40 hover:text-white px-1">取消</button>
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
      <div class="px-6 py-2 border-b border-white/5 flex items-center gap-1 text-white/50 overflow-x-auto">
        <button @click="insertMarkdown('**', '**', '加粗文字')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="加粗">
          <Bold :size="14" />
        </button>
        <button @click="insertMarkdown('*', '*', '斜体文字')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="斜体">
          <Italic :size="14" />
        </button>
        <button @click="insertMarkdown('```\n', '\n```', '代码块')" class="p-1.5 rounded hover:bg-white/10 hover:text-white" title="代码块">
          <Code2 :size="14" />
        </button>
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

        <!-- Live Markdown Preview -->
        <div 
          v-show="viewMode !== 'edit'"
          class="flex-1 h-full p-6 overflow-y-auto bg-black/20"
        >
          <div 
            class="prose prose-invert prose-indigo max-w-none text-white/85 text-sm leading-relaxed"
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
