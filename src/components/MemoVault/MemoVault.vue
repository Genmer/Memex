<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  Calendar, 
  Columns, 
  Download, 
  RefreshCw, 
  Tag as TagIcon, 
  Layers, 
  FileText
} from 'lucide-vue-next'
import MemoCard from './MemoCard.vue'
import MemoTimeline from './MemoTimeline.vue'
import MemoSplitView from './MemoSplitView.vue'
import MemoEditor from './MemoEditor.vue'
import { useToast } from '../../composables/useToast'

const props = defineProps<{
  selectedFolder?: string | null,
  selectedTag?: string | null,
  filterType?: string | null
}>()

const emit = defineEmits(['update-folders', 'update-tags'])

const toast = useToast()

const memos = ref<any[]>([])
const folders = ref<any[]>([])
const tags = ref<any[]>([])
const isLoading = ref(false)

const layoutMode = ref<'grid' | 'timeline' | 'split'>('grid')
const searchQuery = ref('')
const selectedTypeFilter = ref('all')

const showEditor = ref(false)
const editingMemo = ref<any | null>(null)

const availableFolders = computed(() => {
  const set = new Set<string>(['默认备忘', '工作日志', '架构设计', '灵感闪念', '待办清单'])
  folders.value.forEach(f => set.add(f.name))
  return Array.from(set)
})

const loadData = async () => {
  isLoading.value = true
  try {
    const data: any = await invoke('get_memos', {
      folder: props.selectedFolder || null,
      tag: props.selectedTag || null,
      search: searchQuery.value.trim() || null,
      filterType: props.filterType || (selectedTypeFilter.value === 'all' ? null : selectedTypeFilter.value)
    })
    memos.value = data

    const folderData: any = await invoke('get_memo_folders')
    folders.value = folderData
    emit('update-folders', folderData)

    const tagData: any = await invoke('get_memo_tags')
    tags.value = tagData
    emit('update-tags', tagData)
  } catch (err: any) {
    toast.error('加载备忘数据失败: ' + err)
  } finally {
    isLoading.value = false
  }
}

const handleOpenCreate = () => {
  editingMemo.value = null
  showEditor.value = true
}

const handleOpenEdit = (memo: any) => {
  editingMemo.value = memo
  showEditor.value = true
}

const handleSaveMemo = async (payload: any) => {
  try {
    if (payload.id) {
      await invoke('update_memo', {
        id: payload.id,
        payload: {
          title: payload.title,
          content: payload.content,
          folder: payload.folder,
          note_type: payload.note_type,
          color: payload.color,
          tags: payload.tags,
          is_pinned: payload.is_pinned,
          is_favorite: payload.is_favorite
        }
      })
      toast.success('备忘已保存')
    } else {
      await invoke('create_memo', {
        payload: {
          title: payload.title,
          content: payload.content,
          folder: payload.folder,
          note_type: payload.note_type,
          color: payload.color,
          tags: payload.tags,
          is_pinned: payload.is_pinned,
          is_favorite: payload.is_favorite
        }
      })
      toast.success('新备忘创建成功')
    }
    showEditor.value = false
    await loadData()
  } catch (err: any) {
    toast.error('保存失败: ' + err)
  }
}

const handleDeleteMemo = async (id: number) => {
  if (!confirm('确定要删除这篇备忘吗？')) return
  try {
    await invoke('delete_memo', { id })
    toast.success('备忘已删除')
    if (editingMemo.value?.id === id) {
      showEditor.value = false
    }
    await loadData()
  } catch (err: any) {
    toast.error('删除失败: ' + err)
  }
}

const handleTogglePin = async (id: number, isPinned: boolean) => {
  try {
    await invoke('toggle_memo_pinned', { id, isPinned })
    const target = memos.value.find(m => m.id === id)
    if (target) target.is_pinned = isPinned
    toast.success(isPinned ? '已置顶' : '已取消置顶')
    await loadData()
  } catch (err: any) {
    toast.error('操作失败: ' + err)
  }
}

const handleToggleFavorite = async (id: number, isFavorite: boolean) => {
  try {
    await invoke('toggle_memo_favorite', { id, isFavorite })
    const target = memos.value.find(m => m.id === id)
    if (target) target.is_favorite = isFavorite
    toast.success(isFavorite ? '已收藏' : '已取消收藏')
  } catch (err: any) {
    toast.error('操作失败: ' + err)
  }
}

const handleExportMarkdown = async () => {
  try {
    const mdContent: string = await invoke('export_memos_markdown')
    const filePath = await save({
      filters: [{ name: 'Markdown Document', extensions: ['md'] }],
      defaultPath: `Memex_Memos_Backup_${new Date().toISOString().slice(0, 10)}.md`
    })

    if (filePath) {
      // Create blob and trigger download or save
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split('/').pop() || 'memos.md'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('已导出 Markdown 归档文件')
    }
  } catch (err: any) {
    toast.error('导出失败: ' + err)
  }
}

watch([() => props.selectedFolder, () => props.selectedTag, () => props.filterType, selectedTypeFilter], () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 pb-16">
    <!-- Top Action Bar -->
    <div class="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
      <div class="flex items-center gap-3 flex-wrap flex-1">
        <!-- Search Input -->
        <div class="relative w-64">
          <Search :size="14" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input 
            v-model="searchQuery"
            @input="loadData"
            type="text" 
            placeholder="搜索备忘标题、内容或标签..." 
            class="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-inner"
          />
        </div>

        <!-- Type Filter -->
        <div class="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 text-xs font-medium">
          <button 
            @click="selectedTypeFilter = 'all'"
            class="px-3 py-1 rounded-xl transition-all"
            :class="selectedTypeFilter === 'all' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/50 hover:text-white'"
          >
            全部
          </button>
          <button 
            @click="selectedTypeFilter = 'journal'"
            class="px-3 py-1 rounded-xl transition-all"
            :class="selectedTypeFilter === 'journal' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/50 hover:text-white'"
          >
            工作日志
          </button>
          <button 
            @click="selectedTypeFilter = 'todo'"
            class="px-3 py-1 rounded-xl transition-all"
            :class="selectedTypeFilter === 'todo' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/50 hover:text-white'"
          >
            待办清单
          </button>
          <button 
            @click="selectedTypeFilter = 'fleeting'"
            class="px-3 py-1 rounded-xl transition-all"
            :class="selectedTypeFilter === 'fleeting' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/50 hover:text-white'"
          >
            闪念灵感
          </button>
        </div>

        <span class="text-xs text-white/40 font-mono">共 {{ memos.length }} 条备忘</span>
      </div>

      <!-- Right Controls: Layout Switcher, Export & Create -->
      <div class="flex items-center gap-2">
        <!-- Layout Switcher -->
        <div class="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            @click="layoutMode = 'grid'"
            class="p-1.5 rounded-xl transition-all"
            :class="layoutMode === 'grid' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'"
            title="瀑布流卡片视图"
          >
            <LayoutGrid :size="15" />
          </button>
          <button 
            @click="layoutMode = 'timeline'"
            class="p-1.5 rounded-xl transition-all"
            :class="layoutMode === 'timeline' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'"
            title="时间流日志视图"
          >
            <Calendar :size="15" />
          </button>
          <button 
            @click="layoutMode = 'split'"
            class="p-1.5 rounded-xl transition-all"
            :class="layoutMode === 'split' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'"
            title="双栏极速工作台"
          >
            <Columns :size="15" />
          </button>
        </div>

        <!-- Export -->
        <button 
          @click="handleExportMarkdown"
          class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-2xl text-xs font-medium transition-colors flex items-center gap-1.5"
          title="导出 Markdown 归档"
        >
          <Download :size="14" />
          <span>导出</span>
        </button>

        <!-- Refresh -->
        <button 
          @click="loadData"
          class="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-2xl transition-colors"
          title="刷新"
        >
          <RefreshCw :size="14" :class="{ 'animate-spin': isLoading }" />
        </button>

        <!-- Create Button -->
        <button 
          @click="handleOpenCreate"
          class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
        >
          <Plus :size="15" />
          <span>新建备忘</span>
        </button>
      </div>
    </div>

    <!-- Active Filter Tags Display (if any) -->
    <div v-if="selectedFolder || selectedTag" class="flex items-center gap-2 text-xs">
      <span class="text-white/40">当前筛选:</span>
      <span v-if="selectedFolder" class="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
        <Layers :size="12" />
        <span>分类: {{ selectedFolder }}</span>
      </span>
      <span v-if="selectedTag" class="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
        <TagIcon :size="12" />
        <span>标签: #{{ selectedTag }}</span>
      </span>
    </div>

    <!-- Layout 1: Grid / Masonry Cards -->
    <div v-if="layoutMode === 'grid'">
      <div v-if="memos.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <MemoCard 
          v-for="m in memos" 
          :key="m.id"
          :memo="m"
          @edit="handleOpenEdit"
          @delete="handleDeleteMemo"
          @toggle-pin="handleTogglePin"
          @toggle-favorite="handleToggleFavorite"
        />
      </div>

      <div v-else class="text-center py-20 bg-white/[0.01] rounded-3xl border border-dashed border-white/10 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-white/30">
          <FileText :size="24" />
        </div>
        <h4 class="text-sm font-bold text-white/80">当前分类暂无备忘</h4>
        <p class="text-xs text-white/40 max-w-sm mx-auto">
          点击右上角「新建备忘」或随时按 ⌘N 快速创建想法与工作日志
        </p>
        <button 
          @click="handleOpenCreate"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow mt-2"
        >
          + 立即创建
        </button>
      </div>
    </div>

    <!-- Layout 2: Timeline Stream -->
    <div v-else-if="layoutMode === 'timeline'">
      <MemoTimeline 
        :memos="memos"
        @edit="handleOpenEdit"
        @delete="handleDeleteMemo"
        @toggle-pin="handleTogglePin"
        @toggle-favorite="handleToggleFavorite"
      />
    </div>

    <!-- Layout 3: Split Editor Workspace -->
    <div v-else-if="layoutMode === 'split'">
      <MemoSplitView 
        :memos="memos"
        :available-folders="availableFolders"
        @save="handleSaveMemo"
        @delete="handleDeleteMemo"
        @toggle-pin="handleTogglePin"
        @toggle-favorite="handleToggleFavorite"
        @create-new="handleOpenCreate"
      />
    </div>

    <!-- Full-Featured Modal Editor / Drawer -->
    <MemoEditor 
      :show="showEditor"
      :memo="editingMemo"
      :available-folders="availableFolders"
      @close="showEditor = false"
      @save="handleSaveMemo"
      @delete="handleDeleteMemo"
    />
  </div>
</template>
