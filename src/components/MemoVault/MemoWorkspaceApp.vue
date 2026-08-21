<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { 
  BookOpen, 
  Bot, 
  Plus, 
  Search, 
  LayoutGrid, 
  Calendar, 
  Columns, 
  Download, 
  Upload,
  RefreshCw, 
  Pin, 
  Star, 
  CheckSquare, 
  Tag as TagIcon, 
  Layers, 
  FileText, 
  Sparkles, 
  Sun, 
  Moon, 
  Monitor, 
  Globe, 
  X, 
  FolderPlus,
  ArrowLeftRight,
  Trash2,
  Brain,
  RotateCcw
} from 'lucide-vue-next'
import MemoCard from './MemoCard.vue'
import MemoTimeline from './MemoTimeline.vue'
import MemoSplitView from './MemoSplitView.vue'
import MemoEditor from './MemoEditor.vue'
import GitLiteCapsule from '../GitLiteCapsule.vue'
import GitLiteLiveBanner from '../GitLiteLiveBanner.vue'
import { gitliteDb, gitliteStatus } from '../../services/gitliteDb'

import { importFilesToMemos } from '../../services/dbMigration'

import { useToast } from '../../composables/useToast'
import { useTheme } from '../../composables/useTheme'
import { useI18n } from '../../composables/useI18n'
import { APP_VERSION } from '../../version'
import { clearCacheAndHardReload } from '../../utils/cacheHelper'



const emit = defineEmits(['switch-mode'])

const toast = useToast()
const { themeMode, setThemeMode } = useTheme()
const { toggleLanguage } = useI18n()

// Data State
const memos = ref<any[]>([])
const folders = ref<any[]>([])
const tags = ref<any[]>([])
const isLoading = ref(false)

// Navigation & Filter State
const selectedFilter = ref<'all' | 'pinned' | 'favorite' | 'memory' | 'todo' | 'journal'>('all')
const selectedFolder = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const selectedTypeFilter = ref<string>('all')
const searchQuery = ref('')
const layoutMode = ref<'grid' | 'timeline' | 'split'>('grid')

// Folder Creation & Custom Folders
const isCreatingFolder = ref(false)
const newFolderName = ref('')
const customFolders = ref<string[]>([])
const deletedFolders = ref<string[]>([])

const loadFoldersState = () => {
  try {
    const savedCustom = localStorage.getItem('memex_custom_folders')
    if (savedCustom) {
      customFolders.value = JSON.parse(savedCustom)
    }
    const savedDeleted = localStorage.getItem('memex_deleted_folders')
    if (savedDeleted) {
      deletedFolders.value = JSON.parse(savedDeleted)
    }
  } catch (e) {
    console.error('Failed to parse folders state:', e)
  }
}

const saveFoldersState = () => {
  try {
    localStorage.setItem('memex_custom_folders', JSON.stringify(customFolders.value))
    localStorage.setItem('memex_deleted_folders', JSON.stringify(deletedFolders.value))
  } catch (e) {
    console.error('Failed to save folders state:', e)
  }
}

// Merged display folders (only active database folders + user custom folders + base '默认备忘')
const displayFolders = computed(() => {
  const map = new Map<string, number>()
  
  // 1. Permanent anchor folder: '默认备忘'
  map.set('默认备忘', 0)
  
  // 2. Database categories with real item counts
  folders.value.forEach((f: any) => {
    if (f.name && !deletedFolders.value.includes(f.name)) {
      map.set(f.name, f.count)
    }
  })

  // 3. User custom created categories
  customFolders.value.forEach(name => {
    if (!deletedFolders.value.includes(name) && !map.has(name)) {
      map.set(name, 0)
    }
  })

  const list = Array.from(map.entries())
    .filter(([name]) => !deletedFolders.value.includes(name))
    .map(([name, count]) => {
      const parts = name.split('/')
      const depth = parts.length - 1
      const displayName = parts[parts.length - 1]
      const parent = depth > 0 ? parts.slice(0, -1).join('/') : null
      return {
        name,
        displayName,
        depth,
        parent,
        count,
        isCustom: name !== '默认备忘'
      }
    })

  // Sort alphabetically and hierarchically
  list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return list
})

const availableFolders = computed(() => {
  return displayFolders.value.map(f => f.name)
})

const currentBreadcrumb = computed(() => {
  if (selectedFolder.value) return `📂 分类目录 / ${selectedFolder.value}`
  if (selectedTag.value) return `🏷️ 标签检索 / #${selectedTag.value}`
  switch (selectedFilter.value) {
    case 'pinned': return '📌 已置顶备忘'
    case 'favorite': return '⭐ 收藏备忘录'
    case 'memory': return '🧠 个人与项目记忆'
    case 'todo': return '✅ 待办事项清单'
    case 'journal': return '📅 个人工作日志'
    default: return '全部备忘与开发日志'
  }
})

const loadData = async () => {
  isLoading.value = true
  try {
    // 优先读取 GitLite 数据库集合
    let allMemos = await gitliteDb.getMemos()
    
    // 如果 GitLite 中暂无数据，尝试从 SQLite 读取
    if (allMemos.length === 0) {
      try {
        const sqliteMemos: any = await invoke('get_memos', {
          folder: null, tag: null, search: null, filterType: null
        })
        if (Array.isArray(sqliteMemos) && sqliteMemos.length > 0) {
          allMemos = sqliteMemos
        }
      } catch (e) {}
    }

    // 内存极速过滤与排序
    let filtered = allMemos.filter(m => !m.is_archived)

    if (selectedFolder.value) {
      filtered = filtered.filter(m => m.folder === selectedFolder.value || m.folder?.startsWith(selectedFolder.value + '/'))
    }

    if (selectedTag.value) {
      const tagLower = selectedTag.value.toLowerCase()
      filtered = filtered.filter(m => m.tags && m.tags.toLowerCase().includes(tagLower))
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.content.toLowerCase().includes(q) || 
        (m.tags && m.tags.toLowerCase().includes(q))
      )
    }

    if (selectedFilter.value === 'pinned') {
      filtered = filtered.filter(m => m.is_pinned)
    } else if (selectedFilter.value === 'favorite') {
      filtered = filtered.filter(m => m.is_favorite)
    } else if (selectedFilter.value === 'memory') {
      filtered = filtered.filter(m => m.note_type === 'memory')
    } else if (selectedFilter.value === 'todo') {
      filtered = filtered.filter(m => m.note_type === 'todo')
    } else if (selectedFilter.value === 'journal') {
      filtered = filtered.filter(m => m.note_type === 'journal')
    } else if (selectedTypeFilter.value !== 'all') {
      filtered = filtered.filter(m => m.note_type === selectedTypeFilter.value)
    }

    // 确保有 id 属性用于模板兼容 (_id 或 legacy_id 或 id)
    memos.value = filtered.map(m => ({
      ...m,
      id: m.id || m.legacy_id || m._id
    }))

    // 获取文件夹与标签统计
    folders.value = await gitliteDb.getMemoFolders()
    tags.value = await gitliteDb.getMemoTags()
  } catch (err: any) {
    toast.error('加载备忘数据失败: ' + err)
  } finally {
    isLoading.value = false
  }
}

// Editor Modal State
const showEditor = ref(false)
const editingMemo = ref<any | null>(null)

// Stats
const stats = computed(() => {
  const total = memos.value.length
  const pinned = memos.value.filter(m => m.is_pinned).length
  const favorites = memos.value.filter(m => m.is_favorite).length
  const memories = memos.value.filter(m => m.note_type === 'memory').length
  const journals = memos.value.filter(m => m.note_type === 'journal').length
  
  let todoTotal = 0
  let todoCompleted = 0
  memos.value.forEach(m => {
    todoTotal += m.todo_total || 0
    todoCompleted += m.todo_completed || 0
  })

  return {
    total,
    pinned,
    favorites,
    memories,
    journals,
    todoTotal,
    todoCompleted
  }
})

const handleOpenCreate = () => {
  editingMemo.value = selectedFolder.value ? { folder: selectedFolder.value } : null
  showEditor.value = true
}

const handleOpenEdit = (memo: any) => {
  editingMemo.value = memo
  showEditor.value = true
}

const handleSaveMemo = async (payload: any) => {
  try {
    const memoId = payload.id || payload._id
    if (memoId) {
      await gitliteDb.updateMemo(String(memoId), {
        title: payload.title,
        content: payload.content,
        folder: payload.folder,
        note_type: payload.note_type,
        color: payload.color,
        tags: payload.tags,
        is_pinned: payload.is_pinned,
        is_favorite: payload.is_favorite
      })
      // 保持 SQLite 同步（双保险）
      if (typeof payload.id === 'number') {
        invoke('update_memo', { id: payload.id, payload }).catch(() => {})
      }
      toast.success('备忘已保存 (GitLite 同步中)')
    } else {
      await gitliteDb.createMemo({
        title: payload.title,
        content: payload.content,
        folder: payload.folder,
        note_type: payload.note_type,
        color: payload.color,
        tags: payload.tags,
        is_pinned: payload.is_pinned,
        is_favorite: payload.is_favorite
      })
      // 保持 SQLite 同步（双保险）
      invoke('create_memo', { payload }).catch(() => {})
      toast.success('新备忘创建成功 (GitLite 同步中)')
    }
    showEditor.value = false
    await loadData()
  } catch (err: any) {
    toast.error('保存失败: ' + err)
  }
}

const handleDeleteMemo = async (id: any) => {
  if (!confirm('确定要删除这篇备忘吗？')) return
  try {
    await gitliteDb.deleteMemo(String(id))
    if (typeof id === 'number') {
      invoke('delete_memo', { id }).catch(() => {})
    }
    toast.success('备忘已删除')
    if (editingMemo.value?.id === id || editingMemo.value?._id === id) {
      showEditor.value = false
    }
    await loadData()
  } catch (err: any) {
    toast.error('删除失败: ' + err)
  }
}

const handleTogglePin = async (id: any, isPinned: boolean) => {
  try {
    await gitliteDb.toggleMemoPinned(String(id), isPinned)
    if (typeof id === 'number') {
      invoke('toggle_memo_pinned', { id, isPinned }).catch(() => {})
    }
    const target = memos.value.find(m => m.id === id || m._id === id)
    if (target) target.is_pinned = isPinned
    toast.success(isPinned ? '已置顶' : '已取消置顶')
    await loadData()
  } catch (err: any) {
    toast.error('操作失败: ' + err)
  }
}

const handleToggleFavorite = async (id: any, isFavorite: boolean) => {
  try {
    await gitliteDb.toggleMemoFavorite(String(id), isFavorite)
    if (typeof id === 'number') {
      invoke('toggle_memo_favorite', { id, isFavorite }).catch(() => {})
    }
    const target = memos.value.find(m => m.id === id || m._id === id)
    if (target) target.is_favorite = isFavorite
    toast.success(isFavorite ? '已收藏' : '已取消收藏')
  } catch (err: any) {
    toast.error('操作失败: ' + err)

  }
}

const handleCreateFolder = () => {
  const name = newFolderName.value.trim()
  if (!name) return
  
  // Remove from deleted list if recreating
  deletedFolders.value = deletedFolders.value.filter(f => f !== name)
  if (!customFolders.value.includes(name)) {
    customFolders.value.push(name)
  }
  saveFoldersState()
  
  selectedFolder.value = name
  selectedTag.value = null
  selectedFilter.value = 'all'
  newFolderName.value = ''
  isCreatingFolder.value = false
  toast.success(`已新建分类: ${name}`)
  loadData()
}

const handleAddSubFolder = (parentFolder: string, e: MouseEvent) => {
  e.stopPropagation()
  isCreatingFolder.value = true
  newFolderName.value = `${parentFolder}/`
  toast.info(`正在为「${parentFolder}」添加子分类，请输入子分类名称`)
}

const handleDeleteFolder = async (name: string, e: MouseEvent) => {
  e.stopPropagation()
  if (name === '默认备忘') {
    toast.info('默认分类不可删除')
    return
  }

  // Count memos in this folder and subfolders
  const count = memos.value.filter(m => m.folder === name || m.folder?.startsWith(name + '/')).length
  const confirmMsg = count > 0
    ? `确定要删除分类「${name}」吗？\n该分类下的 ${count} 篇备忘将被安全移动到「默认备忘」中，不会丢失内容。`
    : `确定要删除分类「${name}」吗？`

  if (!window.confirm(confirmMsg)) return

  try {
    await invoke('delete_memo_folder', { folder: name })
    
    // Track in deletedFolders & clean from customFolders
    if (!deletedFolders.value.includes(name)) {
      deletedFolders.value.push(name)
    }
    customFolders.value = customFolders.value.filter(f => f !== name && !f.startsWith(name + '/'))
    saveFoldersState()
    
    if (selectedFolder.value === name || selectedFolder.value?.startsWith(name + '/')) {
      selectedFolder.value = null
    }
    
    toast.success(`已删除分类「${name}」${count > 0 ? '，备忘已安全移至默认分类' : ''}`)
    await loadData()
  } catch (err: any) {
    toast.error('删除分类失败: ' + err)
  }
}

const handleExportMarkdown = async () => {
  try {
    const mdContent: string = await invoke('export_memos_markdown')
    const filePath = await save({
      filters: [{ name: 'Markdown Document', extensions: ['md'] }],
      defaultPath: `Memex_Memos_${new Date().toISOString().slice(0, 10)}.md`
    })

    if (filePath) {
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

const fileInputRef = ref<HTMLInputElement | null>(null)


const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

const handleFileInputChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const filesToRead: { name: string; content: string }[] = []
  for (let i = 0; i < target.files.length; i++) {
    const f = target.files[i]
    try {
      const text = await f.text()
      filesToRead.push({ name: f.name, content: text })
    } catch (e) {
      console.warn('Read file failed:', f.name, e)
    }
  }

  if (filesToRead.length === 0) return

  try {
    const targetFolder = selectedFolder.value || '默认备忘'
    const res = await importFilesToMemos(filesToRead, targetFolder)
    toast.success(res.message)
    await loadData()
  } catch (err: any) {
    toast.error('导入失败: ' + err)
  }
}


const isMobileSidebarOpen = ref(false)

const selectFilter = (f: 'all' | 'pinned' | 'favorite' | 'memory' | 'todo' | 'journal') => {
  selectedFilter.value = f
  selectedFolder.value = null
  selectedTag.value = null
  isMobileSidebarOpen.value = false
  loadData()
}

const selectFolder = (folderName: string | null) => {
  selectedFolder.value = folderName
  selectedFilter.value = 'all'
  selectedTag.value = null
  isMobileSidebarOpen.value = false
  loadData()
}

const selectTag = (tagName: string | null) => {
  selectedTag.value = tagName
  selectedFilter.value = 'all'
  selectedFolder.value = null
  isMobileSidebarOpen.value = false
  loadData()
}


const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault()
    handleOpenCreate()
  }
}

onMounted(() => {
  loadFoldersState()
  loadData()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch([selectedTypeFilter, () => gitliteStatus.lastSyncedAt, () => gitliteStatus.isReady], () => {
  loadData()
})

</script>

<template>
  <div class="flex h-screen w-full text-white/90 selection:bg-purple-500/30 overflow-hidden bg-[#0c0e14]">
    <!-- Mobile Backdrop -->
    <div 
      v-if="isMobileSidebarOpen" 
      @click="isMobileSidebarOpen = false" 
      class="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
    ></div>


    <!-- ================= DEDICATED MEMO SIDEBAR ================= -->
    <aside 
      class="fixed md:relative inset-y-0 left-0 z-50 w-72 md:w-64 h-screen flex flex-col bg-[#11131a] md:bg-white/[0.03] backdrop-blur-3xl border-r border-white/10 shrink-0 select-none shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out"
      :class="isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <!-- Top Left Workspace Mode Switcher -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-black/20">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg text-sm shrink-0">
            <BookOpen :size="16" />
          </div>
          <div class="min-w-0">
            <h1 class="font-bold text-sm text-white/95 truncate">个人备忘与日志</h1>
            <p class="text-[10px] text-white/40 font-mono">Personal Vault</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Mode Switch Button -->
          <button 
            @click="emit('switch-mode', 'agent')"
            class="p-2 rounded-xl bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/50 text-white/60 hover:text-indigo-200 transition-all flex items-center gap-1 text-xs"
            title="切换回 Agent 武器库"
          >
            <Bot :size="14" />
          </button>
          
          <!-- Mobile Close Drawer Button -->
          <button 
            @click="isMobileSidebarOpen = false"
            class="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="收起菜单"
          >
            <X :size="15" />
          </button>
        </div>
      </div>


      <!-- Quick Switch Bar -->
      <div class="p-3 border-b border-white/5 bg-black/10">
        <button 
          @click="emit('switch-mode', 'agent')"
          class="w-full py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold flex items-center justify-between transition-all group"
        >
          <span class="flex items-center gap-2">
            <Bot :size="14" class="text-indigo-400" />
            <span>切换至 Agent 武器库</span>
          </span>
          <ArrowLeftRight :size="13" class="opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <!-- Scrollable Navigation Menu -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <!-- Quick Views Section -->
        <div class="space-y-1">
          <div class="px-2 py-1 text-[11px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles :size="12" />
            <span>视图快速导航</span>
          </div>

          <div class="space-y-0.5 pt-1">
            <button 
              @click="selectFilter('all')"
              class="w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between"
              :class="selectedFilter === 'all' && !selectedFolder && !selectedTag ? 'bg-purple-600/20 text-purple-200 font-bold border border-purple-500/40 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'"
            >
              <span class="flex items-center gap-2.5">
                <FileText :size="14" />
                <span>全部备忘</span>
              </span>
              <span class="text-[10px] font-mono opacity-50">{{ stats.total }}</span>
            </button>

            <button 
              @click="selectFilter('pinned')"
              class="w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between"
              :class="selectedFilter === 'pinned' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'"
            >
              <span class="flex items-center gap-2.5">
                <Pin :size="14" class="text-amber-400 fill-amber-400" />
                <span>已置顶</span>
              </span>
              <span class="text-[10px] font-mono opacity-50">{{ stats.pinned }}</span>
            </button>

            <button 
              @click="selectFilter('favorite')"
              class="w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between"
              :class="selectedFilter === 'favorite' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'"
            >
              <span class="flex items-center gap-2.5">
                <Star :size="14" class="text-amber-400 fill-amber-400" />
                <span>收藏夹</span>
              </span>
              <span class="text-[10px] font-mono opacity-50">{{ stats.favorites }}</span>
            </button>

            <button 
              @click="selectFilter('memory')"
              class="w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between"
              :class="selectedFilter === 'memory' ? 'bg-purple-600/20 text-purple-200 font-bold border border-purple-500/40 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'"
            >
              <span class="flex items-center gap-2.5">
                <Brain :size="14" class="text-purple-400" />
                <span>个人记忆</span>
              </span>
              <span class="text-[10px] font-mono opacity-50">{{ stats.memories }}</span>
            </button>

            <button 
              @click="selectFilter('todo')"
              class="w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between"
              :class="selectedFilter === 'todo' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'"
            >
              <span class="flex items-center gap-2.5">
                <CheckSquare :size="14" class="text-emerald-400" />
                <span>待办清单</span>
              </span>
              <span class="text-[10px] font-mono opacity-60 text-emerald-400 font-bold">
                {{ stats.todoCompleted }}/{{ stats.todoTotal }}
              </span>
            </button>

            <button 
              @click="selectFilter('journal')"
              class="w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between"
              :class="selectedFilter === 'journal' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'"
            >
              <span class="flex items-center gap-2.5">
                <Calendar :size="14" class="text-indigo-400" />
                <span>开发日志</span>
              </span>
              <span class="text-[10px] font-mono opacity-50">{{ stats.journals }}</span>
            </button>
          </div>
        </div>

        <!-- Folders Section -->
        <div class="pt-4 border-t border-white/5 space-y-2">
          <div class="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-white/40 uppercase tracking-wider">
            <div class="flex items-center gap-1.5">
              <Layers :size="12" />
              <span>分类目录 (Folders)</span>
            </div>
            <button 
              @click="isCreatingFolder = !isCreatingFolder"
              class="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="新建分类"
            >
              <FolderPlus :size="13" />
            </button>
          </div>

          <!-- Add folder input inline -->
          <div v-if="isCreatingFolder" class="flex items-center gap-1 px-1 py-1 animate-in fade-in zoom-in-95 duration-150">
            <input 
              v-model="newFolderName"
              @keydown.enter="handleCreateFolder"
              @keydown.esc="isCreatingFolder = false; newFolderName = ''"
              placeholder="输入分类名称 (支持使用 / 创建子分类)..."
              class="w-full px-2.5 py-1 text-xs bg-white/10 border border-purple-500/40 rounded-lg text-white placeholder-white/30 focus:outline-none"
              autoFocus
            />
            <button @click="handleCreateFolder" class="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow">确定</button>
            <button @click="isCreatingFolder = false; newFolderName = ''" class="p-1 text-white/40 hover:text-white rounded hover:bg-white/10 shrink-0 cursor-pointer"><X :size="12" /></button>
          </div>

          <div class="space-y-0.5">
            <button 
              v-for="folder in displayFolders" 
              :key="folder.name"
              @click="selectFolder(folder.name)"
              class="w-full py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-between group"
              :class="[
                selectedFolder === folder.name 
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 font-bold' 
                  : 'text-white/60 hover:text-white hover:bg-white/5',
                folder.depth === 0 ? 'px-3' : folder.depth === 1 ? 'pl-6 pr-3' : 'pl-9 pr-3'
              ]"
            >
              <span class="truncate flex items-center gap-1.5 min-w-0">
                <span v-if="folder.depth > 0" class="text-purple-400/60 text-[11px] font-mono select-none">↳</span>
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="folder.count > 0 ? 'bg-purple-400/80' : 'bg-white/20'"></span>
                <span class="truncate">{{ folder.depth > 0 ? folder.displayName : folder.name }}</span>
              </span>
              <div class="flex items-center gap-1 shrink-0 ml-1">
                <span class="text-[10px] font-mono" :class="folder.count > 0 ? 'text-purple-300 font-semibold' : 'text-white/30'">{{ folder.count }}</span>
                
                <!-- Add Subfolder Button -->
                <button
                  @click="handleAddSubFolder(folder.name, $event)"
                  class="opacity-0 group-hover:opacity-100 p-0.5 hover:text-purple-300 hover:bg-white/10 rounded transition-all cursor-pointer"
                  title="在此分类下添加子分类"
                >
                  <Plus :size="11" />
                </button>

                <!-- Delete Folder Button (Available for all custom folders) -->
                <button
                  v-if="folder.name !== '默认备忘'"
                  @click="handleDeleteFolder(folder.name, $event)"
                  class="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 hover:bg-white/10 rounded transition-all cursor-pointer"
                  title="删除此分类（关联备忘将安全移至默认分类）"
                >
                  <Trash2 :size="11" />
                </button>
              </div>
            </button>
          </div>
        </div>

        <!-- Tags Cloud Section -->
        <div v-if="tags && tags.length > 0" class="pt-4 border-t border-white/5 space-y-2">
          <div class="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-white/40 uppercase tracking-wider">
            <div class="flex items-center gap-1.5">
              <TagIcon :size="12" />
              <span>备忘标签 (Tags)</span>
            </div>
            <button 
              v-if="selectedTag"
              @click="selectTag(null)"
              class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] hover:bg-purple-500/30 flex items-center gap-0.5"
            >
              清除 <X :size="10" />
            </button>
          </div>

          <div class="flex flex-wrap gap-1.5 px-1 pt-1">
            <button 
              v-for="tag in tags" 
              :key="tag.name"
              @click="selectTag(selectedTag === tag.name ? null : tag.name)"
              class="px-2 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 border"
              :class="[
                selectedTag === tag.name
                  ? 'bg-purple-500/30 border-purple-400 text-purple-200 shadow-sm font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/5'
              ]"
            >
              <span>#{{ tag.name }}</span>
              <span class="text-[10px] opacity-50">{{ tag.count }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Theme & Language -->
      <div class="p-3 border-t border-white/5 shrink-0 bg-black/15 flex items-center justify-between gap-2">
        <div class="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
          <button 
            @click="setThemeMode('light')"
            class="px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1"
            :class="themeMode === 'light' ? 'bg-white text-purple-600 shadow-sm font-medium' : 'text-white/40 hover:text-white/80'"
            title="浅色模式"
          >
            <Sun :size="13" />
          </button>
          <button 
            @click="setThemeMode('dark')"
            class="px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1"
            :class="themeMode === 'dark' ? 'bg-purple-600 text-white shadow-sm font-medium' : 'text-white/40 hover:text-white/80'"
            title="深色模式"
          >
            <Moon :size="13" />
          </button>
          <button 
            @click="setThemeMode('auto')"
            class="px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1"
            :class="themeMode === 'auto' ? 'bg-white/20 text-white shadow-sm font-medium' : 'text-white/40 hover:text-white/80'"
            title="跟随系统"
          >
            <Monitor :size="13" />
          </button>
        </div>

        <div class="flex items-center gap-1.5">
          <button 
            @click="clearCacheAndHardReload"
            class="px-1.5 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300/60 hover:text-purple-200 border border-purple-500/20 hover:border-purple-500/40 transition-all flex items-center gap-1 font-mono text-[10px] cursor-pointer group"
            title="清空本地快照并强制重载最新版"
          >
            <span>{{ APP_VERSION }}</span>
            <RotateCcw :size="10" class="group-hover:rotate-180 transition-transform duration-300 text-purple-300/40 group-hover:text-purple-200" />
          </button>

          <button @click="toggleLanguage" class="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" title="切换语言">
            <Globe :size="15" />
          </button>
        </div>

      </div>
    </aside>


    <!-- ================= DEDICATED MEMO MAIN WORKSPACE CANVAS ================= -->
    <main class="flex-1 flex flex-col min-w-0 bg-[#0e1017] relative overflow-hidden">
      <!-- Topbar Header (Row 1 with iOS Dynamic Island / Safe Area Top Supported) -->
      <header class="h-auto min-h-[3.5rem] md:min-h-[4rem] pt-[env(safe-area-inset-top,0px)] shrink-0 flex items-center justify-between px-3.5 sm:px-6 md:px-8 bg-black/30 border-b border-white/5 backdrop-blur-xl z-20">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0 mr-2 sm:mr-6 py-2">
          <!-- Mobile Drawer Trigger Button -->
          <button 
            @click="isMobileSidebarOpen = true"
            class="md:hidden p-2 -ml-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 shrink-0 transition-colors cursor-pointer"
            title="打开分类与菜单"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div class="flex items-center gap-2 min-w-0">
            <h2 class="text-sm sm:text-base md:text-lg font-bold tracking-wide text-white/95 truncate">
              {{ currentBreadcrumb }}
            </h2>
            <button 
              @click="clearCacheAndHardReload"
              class="text-[10px] font-mono text-purple-300 hover:text-amber-300 font-bold px-1.5 py-0.5 rounded bg-purple-500/15 hover:bg-amber-500/20 border border-purple-500/30 hover:border-amber-500/40 shrink-0 transition-all flex items-center gap-1 cursor-pointer"
              title="点击清空本地缓存并强制刷新"
            >
              <span>{{ APP_VERSION }}</span>
            </button>

          </div>
          <span class="text-xs text-white/40 font-mono shrink-0 hidden sm:inline">({{ memos.length }} 条)</span>
        </div>


        <!-- Global Memo Search Bar (Desktop) -->
        <div class="flex-1 max-w-xs lg:max-w-md relative hidden md:block">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
            <Search :size="15" />
          </div>
          <input 
            v-model="searchQuery" 
            @input="loadData"
            type="text" 
            placeholder="搜索备忘标题、内容或标签..." 
            class="w-full bg-white/5 hover:bg-white/[0.08] border border-white/10 focus:border-purple-500/50 rounded-full py-1.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:outline-none transition-all shadow-inner"
          />
        </div>

        <!-- Right Controls -->
        <div class="flex items-center gap-2 sm:gap-3 shrink-0 ml-2 sm:ml-6">
          <!-- Desktop Type Filter Selector (Hidden on Mobile, rendered in Row 2 below) -->
          <div class="hidden lg:flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 text-xs font-medium">
            <button 
              @click="selectedTypeFilter = 'all'; loadData()"
              class="px-2.5 py-1 rounded-xl transition-all"
              :class="selectedTypeFilter === 'all' ? 'bg-purple-600 text-white font-bold shadow' : 'text-white/50 hover:text-white'"
            >
              全部
            </button>
            <button 
              @click="selectedTypeFilter = 'memory'; loadData()"
              class="px-2.5 py-1 rounded-xl transition-all"
              :class="selectedTypeFilter === 'memory' ? 'bg-purple-600 text-white font-bold shadow' : 'text-white/50 hover:text-white'"
            >
              记忆
            </button>
            <button 
              @click="selectedTypeFilter = 'journal'; loadData()"
              class="px-2.5 py-1 rounded-xl transition-all"
              :class="selectedTypeFilter === 'journal' ? 'bg-purple-600 text-white font-bold shadow' : 'text-white/50 hover:text-white'"
            >
              日志
            </button>
            <button 
              @click="selectedTypeFilter = 'todo'; loadData()"
              class="px-2.5 py-1 rounded-xl transition-all"
              :class="selectedTypeFilter === 'todo' ? 'bg-purple-600 text-white font-bold shadow' : 'text-white/50 hover:text-white'"
            >
              待办
            </button>
            <button 
              @click="selectedTypeFilter = 'fleeting'; loadData()"
              class="px-2.5 py-1 rounded-xl transition-all"
              :class="selectedTypeFilter === 'fleeting' ? 'bg-purple-600 text-white font-bold shadow' : 'text-white/50 hover:text-white'"
            >
              灵感
            </button>
          </div>

          <!-- Desktop Layout Switcher (Grid, Timeline, Split) -->
          <div class="hidden md:flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
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

          <!-- GitLite Status Capsule -->
          <GitLiteCapsule @refresh="loadData" />

          <!-- Hidden File Input for Import -->
          <input 
            type="file" 
            ref="fileInputRef" 
            class="hidden" 
            multiple 
            accept=".md,.markdown,.json,.txt" 
            @change="handleFileInputChange" 
          />

          <!-- Desktop Import & Export & Refresh Buttons -->
          <div class="hidden sm:flex items-center gap-1.5">
            <button 
              @click="triggerFileInput"
              class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
              title="导入备忘"
            >
              <Upload :size="13" />
              <span>导入</span>
            </button>
            <button 
              @click="handleExportMarkdown"
              class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
              title="导出 Markdown"
            >
              <Download :size="13" />
              <span>导出</span>
            </button>
            <button 
              @click="loadData"
              class="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-colors"
              title="刷新数据"
            >
              <RefreshCw :size="13" :class="{ 'animate-spin': isLoading }" />
            </button>
          </div>


          <!-- Create Button (Adaptive on Mobile) -->
          <button 
            @click="handleOpenCreate"
            class="py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/25 flex items-center gap-1.5 active:scale-95"
            title="新建备忘"
          >
            <Plus :size="15" />
            <span class="hidden sm:inline">新建备忘 (⌘N)</span>
            <span class="sm:hidden font-bold">新建</span>
          </button>
        </div>
      </header>

      <!-- Persistent Realtime Live Status Banner -->
      <GitLiteLiveBanner @refresh="loadData" />


      <!-- Subheader Filter & Search Bar for Mobile/Tablet (Row 2) -->
      <div class="lg:hidden shrink-0 flex items-center justify-between px-3.5 py-2 bg-black/20 border-b border-white/5 gap-2 overflow-x-auto no-scrollbar">
        <!-- Horizontal Scrollable Filter Chips -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button 
            @click="selectedTypeFilter = 'all'; loadData()"
            class="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0"
            :class="selectedTypeFilter === 'all' ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30' : 'bg-white/5 text-white/60 hover:text-white border border-white/5'"
          >
            全部
          </button>
          <button 
            @click="selectedTypeFilter = 'memory'; loadData()"
            class="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1"
            :class="selectedTypeFilter === 'memory' ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30' : 'bg-white/5 text-white/60 hover:text-white border border-white/5'"
          >
            <span>🧠 记忆</span>
          </button>
          <button 
            @click="selectedTypeFilter = 'journal'; loadData()"
            class="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1"
            :class="selectedTypeFilter === 'journal' ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30' : 'bg-white/5 text-white/60 hover:text-white border border-white/5'"
          >
            <span>📅 日志</span>
          </button>
          <button 
            @click="selectedTypeFilter = 'todo'; loadData()"
            class="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1"
            :class="selectedTypeFilter === 'todo' ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30' : 'bg-white/5 text-white/60 hover:text-white border border-white/5'"
          >
            <span>✅ 待办</span>
          </button>
          <button 
            @click="selectedTypeFilter = 'fleeting'; loadData()"
            class="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1"
            :class="selectedTypeFilter === 'fleeting' ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30' : 'bg-white/5 text-white/60 hover:text-white border border-white/5'"
          >
            <span>💡 灵感</span>
          </button>
        </div>

        <!-- Mobile Layout Switcher -->
        <div class="flex md:hidden items-center bg-white/5 p-0.5 rounded-xl border border-white/10 shrink-0 ml-auto">
          <button 
            @click="layoutMode = 'grid'"
            class="p-1 rounded-lg transition-all"
            :class="layoutMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'"
            title="卡片"
          >
            <LayoutGrid :size="13" />
          </button>
          <button 
            @click="layoutMode = 'timeline'"
            class="p-1 rounded-lg transition-all"
            :class="layoutMode === 'timeline' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'"
            title="时间流"
          >
            <Calendar :size="13" />
          </button>
        </div>
      </div>

      <!-- Scrollable Main View Body -->
      <div class="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 relative">
        <!-- Layout 1: Grid / Masonry Cards -->
        <div v-if="layoutMode === 'grid'">
          <div v-if="memos.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            <MemoCard 
              v-for="m in memos" 
              :key="m.id"
              :memo="m"
              @edit="handleOpenEdit"
              @delete="handleDeleteMemo"
              @toggle-pin="handleTogglePin"
              @toggle-favorite="handleToggleFavorite"
              @select-tag="selectTag"
            />
          </div>

          <div v-else class="text-center py-16 sm:py-24 px-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/10 space-y-4 animate-in fade-in duration-200">
            <div class="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
              <FileText :size="24" />
            </div>
            <div class="space-y-1">
              <h4 class="text-sm sm:text-base font-bold text-white/90">
                {{ selectedFolder ? `分类 "${selectedFolder}" 下暂无备忘` : '暂无匹配备忘或日志' }}
              </h4>
              <p class="text-xs text-white/40 max-w-sm mx-auto">
                {{ selectedFolder ? '已为您自动选中此分类，点击下方按钮立即记录第一条内容' : '随时记录您的架构想法、踩坑记录或每日待办' }}
              </p>
            </div>
            <button 
              @click="handleOpenCreate"
              class="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/30 flex items-center gap-1.5 mx-auto active:scale-95"
            >
              <Plus :size="14" />
              <span>{{ selectedFolder ? `在 "${selectedFolder}" 下新建备忘` : '立即创建第一篇备忘' }}</span>
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
            @select-tag="selectTag"
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
            @close="layoutMode = 'grid'"
          />
        </div>
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
    </main>
  </div>
</template>
