<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open, save } from '@tauri-apps/plugin-dialog'
import SkillCard from './components/SkillCard.vue'
import MemoryCard from './components/MemoryCard.vue'
import Sidebar from './components/Sidebar.vue'
import Dashboard from './components/Dashboard.vue'
import Toast from './components/Toast.vue'
import SkillDrawer from './components/SkillDrawer.vue'
import AiChatPanel from './components/AiChatPanel.vue'
import AiKeyPrompt from './components/AiKeyPrompt.vue'
import { useI18n } from './composables/useI18n'
import { useToast } from './composables/useToast'
import { Search, Folder, Sparkles, LayoutGrid, List, Star, Tag, X, CheckSquare, Trash2 } from 'lucide-vue-next'

const toast = useToast()

const { t } = useI18n()

const activeView = ref('dashboard')
const skills = ref<any[]>([])
const memories = ref<any[]>([])
const isScanning = ref(false)
const showWelcomePrompt = ref(false)
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const favoriteOnly = ref(false)
const selectedTag = ref<string | null>(null)
const sortBy = ref<'recent' | 'name' | 'favorite'>('recent')

// Batch selection state
const isBatchMode = ref(false)
const selectedIds = ref<number[]>([])

const sortOptions: { value: 'recent' | 'name' | 'favorite', label: string }[] = [
  { value: 'recent', label: '最近更新' },
  { value: 'name', label: '名称' },
  { value: 'favorite', label: '收藏优先' }
]

const allTags = computed(() => {
  const counts: Record<string, number> = {}
  const collect = (tagsStr?: string | null) => {
    if (!tagsStr) return
    tagsStr.split(',').forEach(raw => {
      const tag = raw.trim()
      if (tag) counts[tag] = (counts[tag] || 0) + 1
    })
  }
  skills.value.forEach(s => collect(s.tags))
  memories.value.forEach(m => collect(m.tags))
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

const currentCount = computed(() => activeView.value.includes('skills') ? filteredSkills.value.length : filteredMemories.value.length)

// Drawer / create state
const drawerType = ref<'skill' | 'memory'>('skill')
const drawerIsNew = ref(false)
const drawerAsset = ref<any>(null)

// Progress state
const scanProgressMessage = ref('')
const scanProgressCount = ref(0)
let unlistenProgress: (() => void) | null = null

const searchInputRef = ref<HTMLInputElement | null>(null)

// AI state
const showAiChat = ref(false)
const showAiKeyPrompt = ref(false)
const aiInitialQuery = ref('')
const hasAiKey = ref(false)
const aiApiKey = ref('')
const aiModel = ref('deepseek-v4-flash')

// Config states
const scanTargets = ref<any[]>([])
const pinnedSources = ref<string[]>([])

const fetchData = async () => {
  try {
    skills.value = await invoke('get_skills')
    memories.value = await invoke('get_memories')
    if (skills.value.length === 0 && !sessionStorage.getItem('prompt_shown')) {
      showWelcomePrompt.value = true
      sessionStorage.setItem('prompt_shown', 'true')
    }
  } catch (error) {
    // Mock fallback for pure-browser preview (no Tauri runtime)
    console.warn('Tauri invoke failed, using mock data:', error)
    skills.value = mockSkills
    memories.value = mockMemories
  }
}

const fetchConfigs = async () => {
  try {
    const configs: any[] = await invoke('get_configs')
    scanTargets.value = await invoke('get_scan_targets')
    const pinned = configs.find(c => c.key_name === 'PINNED_SOURCES')
    if (pinned && pinned.key_value) {
      try {
        pinnedSources.value = JSON.parse(pinned.key_value)
      } catch(e) {}
    }
    // AI configs
    const aiKey = configs.find(c => c.key_name === 'DEEPSEEK_API_KEY')
    const aiMdl = configs.find(c => c.key_name === 'AI_MODEL')
    if (aiKey && aiKey.key_value) {
      hasAiKey.value = true
      aiApiKey.value = aiKey.key_value
    }
    if (aiMdl && aiMdl.key_value) {
      aiModel.value = aiMdl.key_value
    }
  } catch (error) {
    console.warn('Tauri config fetch failed, using mock configs:', error)
    scanTargets.value = mockTargets
    pinnedSources.value = []
    hasAiKey.value = false
  }
}

const mockSkills = [
  {
    id: 1, name: 'Python 代码审查',
    content: '# Python 代码审查规范\n\n请严格按以下标准审查代码：\n\n1. 类型注解覆盖所有函数签名\n2. docstring 采用 Google 风格\n3. 使用 dataclass 而非裸字典传递状态\n4. 复杂度圈数 > 10 的函数必须拆分',
    source_tool: 'memex_native',
    local_path: null,
    prefix_template: '请严格遵守以下 Skill 规范回答：',
    tags: 'python, code-review, best-practice',
    priority: 90,
    is_favorite: true,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 2, name: 'React 组件模板',
    content: '# React 组件最佳实践\n\n- 优先使用 FC + hooks，避免 class component\n- 业务组件拆分 ≤ 120 行\n- 自定义 hook 以 use 前缀开头\n- 状态最小化：优先派生计算而非多余 state',
    source_tool: 'zcode',
    local_path: '/Users/user/.zcode/skills/react.md',
    prefix_template: '请严格遵守以下 Skill 规范回答：',
    tags: 'react, frontend, typescript',
    priority: 70,
    is_favorite: false,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 3, name: 'SQL 索引规范',
    content: '# SQL 索引编写规则\n\n1. 复合索引遵循最左前缀匹配\n2. 选择性低的列不建单列索引\n3. 避免 SELECT *\n4. 大表分页用游标而非 OFFSET',
    source_tool: 'claude',
    local_path: '/Users/user/.claude/skills/sql.md',
    prefix_template: 'Use the following template/skill:',
    tags: 'sql, database, performance',
    priority: 50,
    is_favorite: true,
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 4, name: '安全编码 Checklist',
    content: '# 安全编码检查清单\n\n- 所有外部输入做校验与类型约束\n- 鉴权在路由层 + 服务层双重检查\n- 敏感字段日志脱敏\n- 密码使用 bcrypt/Argon2 而非散列',
    source_tool: 'trae',
    local_path: '/Users/user/.trae-cn/skills/security.md',
    tags: 'security, backend',
    priority: 80,
    is_favorite: false,
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
]

const mockMemories = [
  {
    id: 1, name: '项目 A 架构决策记录',
    source_tool: 'zcode',
    session_id: null,
    content: '2026 Q1 架构调整：拆分订单服务为 CQRS 双写。\n- 写库 MySQL 8 / 读库 PostgreSQL\n- 同步通道用 Kafka compact topic\n- 1 个月后弃用旧读接口',
    tags: 'architecture, project-A',
    priority: 70,
    is_favorite: true,
    extracted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 2, name: '常见坑：Vite 3 端口冲突',
    source_tool: 'memex_native',
    content: '端口 5173 被占用时 Vite 报错不直观。\n解决：lsof -i :5173 找 PID kill，或在 vite.config.ts 中指定 server.strictPort: false。',
    tags: 'vite, frontend, troubleshooting',
    priority: 50,
    is_favorite: false,
    extracted_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 8).toISOString()
  }
]

const mockTargets = [
  { id: 1, path: '/Users/user/.gemini/config', override_tool: 'zcode', priority: 50, is_enabled: true, created_at: new Date().toISOString() },
  { id: 2, path: '/Users/user/.agents/skills', override_tool: 'agents', priority: 10, is_enabled: true, created_at: new Date().toISOString() }
]

const togglePin = async (sourceId: string) => {
  if (pinnedSources.value.includes(sourceId)) {
    pinnedSources.value = pinnedSources.value.filter(id => id !== sourceId)
  } else {
    pinnedSources.value.push(sourceId)
  }
  try {
    await invoke('save_config', { keyName: 'PINNED_SOURCES', keyValue: JSON.stringify(pinnedSources.value) })
  } catch (error) {
    console.error('Failed to save pinned sources:', error)
  }
}

const saveAllConfigs = async () => {
  try {
    // AI configs
    if (aiApiKey.value.trim()) {
      await invoke('save_config', { keyName: 'DEEPSEEK_API_KEY', keyValue: aiApiKey.value.trim() })
      hasAiKey.value = true
    }
    await invoke('save_config', { keyName: 'AI_MODEL', keyValue: aiModel.value || 'deepseek-v4-flash' })
    toast.success('配置保存成功')
  } catch (error) {
    toast.error('保存失败')
    console.error(error)
  }
}

const addTarget = async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Directory to Scan'
    })
    if (selected && typeof selected === 'string') {
      await invoke('add_scan_target', { path: selected })
      scanTargets.value = await invoke('get_scan_targets')
      toast.success('扫描路径已添加')
    }
  } catch (err) {
    console.error('Failed to add target', err)
  }
}

const toggleTarget = async (id: number, is_enabled: boolean) => {
  await invoke('toggle_scan_target', { id, isEnabled: is_enabled })
  scanTargets.value = await invoke('get_scan_targets')
}

const removeTarget = async (id: number) => {
  await invoke('remove_scan_target', { id })
  scanTargets.value = await invoke('get_scan_targets')
}

const exportAssets = async () => {
  const path = await save({
    defaultPath: `memex-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (!path) return
  try {
    const n: number = await invoke('export_assets', { path })
    toast.success(`已导出 ${n} 个资产`)
  } catch (err) {
    toast.error('导出失败: ' + err)
  }
}

const importAssets = async () => {
  const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] })
  if (!path || typeof path !== 'string') return
  try {
    const n: number = await invoke('import_assets', { path })
    toast.success(`已导入 ${n} 个新资产`)
    await fetchData()
  } catch (err) {
    toast.error('导入失败: ' + err)
  }
}

const scanNow = async () => {
  if (isScanning.value) return
  isScanning.value = true
  showWelcomePrompt.value = false
  scanProgressMessage.value = 'Initializing scan...'
  scanProgressCount.value = 0
  
  try {
    const added: number = await invoke('trigger_scan')
    await fetchData()
    toast.success(`扫描完成，发现/更新 ${added} 个资产`)
  } catch (error) {
    console.error('Failed to scan:', error)
    toast.error('扫描失败: ' + error)
  } finally {
    isScanning.value = false
  }
}

const toggleBatchMode = () => {
  isBatchMode.value = !isBatchMode.value
  selectedIds.value = []
}

const toggleSelectId = (id: number) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(x => x !== id)
  } else {
    selectedIds.value.push(id)
  }
}

const selectAllCurrent = () => {
  const currentList = activeView.value.includes('skills') ? filteredSkills.value : filteredMemories.value
  selectedIds.value = currentList.map(item => item.id)
}

const deselectAll = () => {
  selectedIds.value = []
}

const batchToggleFavorite = async (isFavorite: boolean) => {
  if (selectedIds.value.length === 0) return
  const assetType = activeView.value.includes('memories') ? 'memory' : 'skill'
  try {
    const count: number = await invoke('batch_toggle_favorite', {
      ids: selectedIds.value,
      isFavorite,
      assetType
    })
    toast.success(`已批量${isFavorite ? '收藏' : '取消收藏'} ${count} 项`)
    await fetchData()
    selectedIds.value = []
  } catch (err) {
    toast.error('批量操作失败: ' + err)
  }
}

const batchAddTag = async () => {
  if (selectedIds.value.length === 0) return
  const tag = window.prompt('请输入要批量追加的标签名称 (例如: core, prompt):')
  if (!tag || !tag.trim()) return
  const assetType = activeView.value.includes('memories') ? 'memory' : 'skill'
  try {
    const count: number = await invoke('batch_add_tag', {
      ids: selectedIds.value,
      tag: tag.trim(),
      assetType
    })
    toast.success(`已为 ${count} 项批量追加标签 #${tag.trim()}`)
    await fetchData()
    selectedIds.value = []
  } catch (err) {
    toast.error('批量打标签失败: ' + err)
  }
}

const batchDelete = async () => {
  if (selectedIds.value.length === 0) return
  const confirmed = window.confirm(`确定要批量删除选中的 ${selectedIds.value.length} 项资产吗？此操作不可恢复。`)
  if (!confirmed) return
  const assetType = activeView.value.includes('memories') ? 'memory' : 'skill'
  try {
    const count: number = await invoke('batch_delete', {
      ids: selectedIds.value,
      assetType
    })
    toast.success(`已批量删除 ${count} 项`)
    await fetchData()
    selectedIds.value = []
  } catch (err) {
    toast.error('批量删除失败: ' + err)
  }
}

const handleSidebarSelect = (id: string) => {
  activeView.value = id
  searchQuery.value = ''
  selectedIds.value = []
}

const uniqueSources = computed(() => {
  const sources = new Set<string>()
  skills.value.forEach(s => {
    if (s.source_tool && s.source_tool !== 'memex_native') {
      sources.add(s.source_tool)
    }
  })
  return Array.from(sources)
})

const filteredSkills = computed(() => {
  let list = skills.value
  
  if (activeView.value === 'memex-skills') {
    list = list.filter(s => s.source_tool === 'memex_native')
  } else if (activeView.value.endsWith('-skills')) {
    const source = activeView.value.replace('-skills', '')
    list = list.filter(s => s.source_tool === source)
  }
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => s.name.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.tags && s.tags.toLowerCase().includes(q)))
  }
  if (selectedTag.value) {
    const t = selectedTag.value.toLowerCase()
    list = list.filter(s => s.tags && s.tags.toLowerCase().split(',').map((x: string) => x.trim()).includes(t))
  }
  if (favoriteOnly.value) {
    list = list.filter(s => s.is_favorite)
  }
  list = [...list].sort(sortSkills(sortBy.value))
  return list
})

const filteredMemories = computed(() => {
  let list = memories.value
  
  if (activeView.value.endsWith('-memories')) {
    const source = activeView.value.replace('-memories', '')
    list = list.filter(s => s.source_tool === source)
  }
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => s.name.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.tags && s.tags.toLowerCase().includes(q)))
  }
  if (selectedTag.value) {
    const t = selectedTag.value.toLowerCase()
    list = list.filter(s => s.tags && s.tags.toLowerCase().split(',').map((x: string) => x.trim()).includes(t))
  }
  if (favoriteOnly.value) {
    list = list.filter(s => s.is_favorite)
  }
  list = [...list].sort(sortByTimeOrName(sortBy.value, 'updated_at'))
  return list
})

const sortSkills = (mode: string) => (a: any, b: any) => {
  if (mode === 'favorite') {
    const fa = a.is_favorite ? 1 : 0, fb = b.is_favorite ? 1 : 0
    if (fa !== fb) return fb - fa
  }
  if (mode === 'name') return a.name.localeCompare(b.name)
  // recent (default)
  return (b.updated_at || '').localeCompare(a.updated_at || '')
}

const sortByTimeOrName = (mode: string, timeField: string) => (a: any, b: any) => {
  if (mode === 'name') return a.name.localeCompare(b.name)
  if (mode === 'favorite') {
    const fa = a.is_favorite ? 1 : 0, fb = b.is_favorite ? 1 : 0
    if (fa !== fb) return fb - fa
  }
  return (b[timeField] || b.extracted_at || '').localeCompare(a[timeField] || a.extracted_at || '')
}

const viewTitle = computed(() => {
  if (activeView.value.includes('skills')) return t('header.title.skills')
  if (activeView.value.includes('memories')) return t('header.title.memories')
  if (activeView.value === 'settings') return t('header.title.settings')
  return t('header.title.dashboard')
})

const openAssetDetail = (asset: any, type: 'skill' | 'memory') => {
  drawerType.value = type
  drawerIsNew.value = false
  drawerAsset.value = asset
}

const openNewAsset = (type: 'skill' | 'memory') => {
  drawerType.value = type
  drawerIsNew.value = true
  drawerAsset.value = {
    id: null,
    name: '',
    content: '',
    source_tool: 'memex_native',
    tags: '',
    is_favorite: false
  }
}

const closeDrawer = () => {
  drawerAsset.value = null
}

const handleDrawerSaved = async () => {
  drawerAsset.value = null
  await fetchData()
}

const handleDrawerDeleted = async () => {
  drawerAsset.value = null
  await fetchData()
}

const handleFavoriteToggled = (assetId: number, newVal: boolean, type?: 'skill' | 'memory') => {
  if (type === 'memory') {
    const mem = memories.value.find(m => m.id === assetId)
    if (mem) mem.is_favorite = newVal
  } else {
    const skill = skills.value.find(s => s.id === assetId)
    if (skill) skill.is_favorite = newVal
  }
  if (drawerAsset.value && drawerAsset.value.id === assetId) {
    drawerAsset.value = { ...drawerAsset.value, is_favorite: newVal }
  }
}

const dismissAiPrompt = () => {
  showAiKeyPrompt.value = false
  sessionStorage.setItem('ai_prompt_dismissed', 'true')
}

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
  if (e.key === 'Escape' && drawerAsset.value) {
    drawerAsset.value = null
  }
}

const openAiChat = (query?: string) => {
  if (!hasAiKey.value) {
    showAiKeyPrompt.value = true
    return
  }
  aiInitialQuery.value = query || ''
  showAiChat.value = true
}

const handleAiKeySaved = () => {
  hasAiKey.value = true
  fetchConfigs()
}

// Build context string for AI from current skills
const aiSkillContext = computed(() => {
  const list = skills.value.slice(0, 20)
  if (list.length === 0) return ''
  return '当前技能库包含以下资产:\n' + list.map(s => `- [${s.source_tool}] ${s.name}: ${s.content.substring(0, 100)}...`).join('\n')
})

onMounted(async () => {
  await fetchData()
  await fetchConfigs()
  
  unlistenProgress = await listen('scan-progress', (event: any) => {
    scanProgressMessage.value = event.payload.message
    scanProgressCount.value = event.payload.count
  })
  
  window.addEventListener('keydown', handleKeydown)
  
  // Show AI key prompt on first launch if no key configured
  setTimeout(() => {
    if (!hasAiKey.value && !sessionStorage.getItem('ai_prompt_dismissed')) {
      showAiKeyPrompt.value = true
    }
  }, 1500)
})

onUnmounted(() => {
  if (unlistenProgress) {
    unlistenProgress()
  }
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="flex h-screen w-full text-white/90 selection:bg-indigo-500/30">
    <!-- Sidebar -->
    <Sidebar 
      :unique-sources="uniqueSources" 
      :pinned-sources="pinnedSources" 
      :all-tags="allTags"
      :selected-tag="selectedTag"
      @select="handleSidebarSelect" 
      @toggle-pin="togglePin"
      @select-tag="selectedTag = $event"
    />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 bg-white/5 backdrop-blur-md relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] border-l border-white/10 relative">
      
      <!-- Topbar / Breadcrumb -->
      <header class="h-16 shrink-0 flex items-center justify-between px-8 bg-black/10 border-b border-white/5 backdrop-blur-xl">
        <h2 class="text-xl font-medium tracking-wide text-white/90 drop-shadow-md shrink-0 mr-8">
          {{ viewTitle }}
        </h2>

        <!-- Global Search Bar (Only in list views) -->
        <div class="flex-1 max-w-xl relative hidden md:block" v-if="activeView.includes('skills') || activeView.includes('memories')">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search :size="16" class="text-white/40" />
          </div>
          <input 
            ref="searchInputRef"
            v-model="searchQuery" 
            type="text" 
            :placeholder="t('search.placeholder') + ' (⌘K)'"
            class="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner"
          />
        </div>
        
        <div class="flex items-center gap-4 ml-8 shrink-0">
          <div class="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10" v-if="activeView.includes('skills') || activeView.includes('memories')">
            <button @click="viewMode = 'grid'" class="p-1.5 rounded-md transition-all" :class="viewMode === 'grid' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/70'" title="网格视图">
              <LayoutGrid :size="16" />
            </button>
            <button @click="viewMode = 'list'" class="p-1.5 rounded-md transition-all" :class="viewMode === 'list' ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/70'" title="列表视图">
              <List :size="16" />
            </button>
          </div>
          <button 
            v-if="activeView.includes('skills') || activeView.includes('memories')"
            @click="openNewAsset(activeView.includes('skills') ? 'skill' : 'memory')"
            class="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            title="新建资产"
          >
            <span class="text-base leading-none">+</span> 新建
          </button>
          <button 
            v-if="activeView.includes('skills') || activeView.includes('memories') || activeView === 'settings'"
            @click="scanNow" 
            class="px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-md disabled:opacity-50"
            :disabled="isScanning"
          >
            <svg v-if="isScanning" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ isScanning ? t('header.syncing') : t('header.sync') }}
          </button>
          <button
            @click="openAiChat()"
            class="p-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
            title="AI 助手"
          >
            <Sparkles :size="18" />
          </button>
        </div>
      </header>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-8 relative">

        <!-- Scanning Progress Overlay -->
        <div v-if="isScanning" class="absolute inset-x-8 top-8 z-20 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 rounded-xl p-4 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-indigo-300 flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Neural Scan in Progress
            </span>
            <span class="text-xs font-mono text-indigo-300/70">Found: {{ scanProgressCount }}</span>
          </div>
          <!-- Indeterminate Progress Bar -->
          <div class="w-full bg-black/20 rounded-full h-1.5 mb-2 overflow-hidden relative">
            <div class="absolute top-0 left-0 h-full bg-indigo-500 rounded-full w-1/3 animate-[slide_1.5s_ease-in-out_infinite]"></div>
          </div>
          <div class="text-[10px] text-white/40 font-mono truncate w-full" :title="scanProgressMessage">{{ scanProgressMessage }}</div>
        </div>

        <!-- Filter / Sort Bar -->
        <div v-if="activeView.includes('skills') || activeView.includes('memories')" class="flex items-center gap-3 mb-6 flex-wrap animate-in fade-in duration-300">
          <button 
            @click="favoriteOnly = !favoriteOnly"
            class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5"
            :class="favoriteOnly ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'"
          >
            <Star :size="12" :class="{ 'fill-current': favoriteOnly }" /> 只看收藏
          </button>
          <div class="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
              v-for="opt in sortOptions" 
              :key="opt.value"
              @click="sortBy = opt.value"
              class="px-3 py-1 rounded-md text-xs transition-colors"
              :class="sortBy === opt.value ? 'bg-indigo-500/25 text-indigo-200' : 'text-white/50 hover:text-white/80'"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- Batch Mode Toggle Button -->
          <button
            @click="toggleBatchMode"
            class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5"
            :class="isBatchMode ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'"
          >
            <CheckSquare :size="13" />
            <span>{{ isBatchMode ? '退出批量' : '批量管理' }}</span>
          </button>

          <!-- Select All / Deselect buttons in batch mode -->
          <template v-if="isBatchMode">
            <button 
              @click="selectAllCurrent"
              class="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors"
            >
              全选
            </button>
            <button 
              @click="deselectAll"
              class="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors"
            >
              清空选择
            </button>
          </template>

          <!-- Active Tag Badge -->
          <div v-if="selectedTag" class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-mono">
            <Tag :size="12" />
            <span>{{ selectedTag }}</span>
            <button @click="selectedTag = null" class="ml-1 hover:text-white hover:bg-white/10 p-0.5 rounded transition-colors">
              <X :size="12" />
            </button>
          </div>

          <div class="flex-1"></div>
          <span class="text-xs text-white/40 font-mono">{{ currentCount }} 项</span>
        </div>

        <!-- DASHBOARD VIEW -->
        <div v-if="activeView === 'dashboard'">
          <Dashboard />
        </div>
        
        <div v-else-if="activeView.includes('skills')" class="h-full">
          <!-- Skill Grid / List -->
          <div v-if="filteredSkills.length" 
               class="animate-in fade-in zoom-in-95 duration-500 pb-12"
               :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-3'">
            <SkillCard 
              v-for="skill in filteredSkills" 
              :key="skill.id" 
              :skill="skill"
              :search-query="searchQuery"
              :view-mode="viewMode"
              :is-select-mode="isBatchMode"
              :is-selected="selectedIds.includes(skill.id)"
              @open-detail="(s) => openAssetDetail(s, 'skill')"
              @favorite-toggled="handleFavoriteToggled"
              @select-tag="selectedTag = $event"
              @toggle-select="toggleSelectId"
            />
          </div>
          
          <!-- Empty State -->
          <div v-else class="h-full flex flex-col items-center justify-center py-20 opacity-80">
            <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
              <svg class="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <h3 class="text-xl font-medium tracking-wide">{{ t('hub.empty.title') }}</h3>
            <p class="text-white/50 mt-2 max-w-sm text-center text-sm">
              {{ searchQuery ? '没有找到匹配的技能' : t('hub.empty.desc') }}
            </p>
            <button 
              v-if="searchQuery"
              @click="openAiChat(`我搜索 '${searchQuery}' 没有找到结果，请帮我分析可能的原因，以及如何配置才能找到相关的技能`)"
              class="mt-6 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-medium shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all"
            >
              <Sparkles :size="16" />
              问问 AI 助手
            </button>
          </div>
        </div>

        <!-- MEMORIES VIEW -->
        <div v-else-if="activeView.includes('memories')" class="h-full">
          <!-- Memories Grid / List -->
          <div v-if="filteredMemories.length" 
               class="animate-in fade-in zoom-in-95 duration-500 pb-12"
               :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-3'">
            <MemoryCard 
              v-for="memory in filteredMemories" 
              :key="memory.id" 
              :memory="memory" 
              :search-query="searchQuery"
              :view-mode="viewMode"
              :is-select-mode="isBatchMode"
              :is-selected="selectedIds.includes(memory.id)"
              @open-detail="(m) => openAssetDetail(m, 'memory')"
              @favorite-toggled="(id, v) => handleFavoriteToggled(id, v, 'memory')"
              @select-tag="selectedTag = $event"
              @toggle-select="toggleSelectId"
            />
          </div>
          
          <!-- Empty State -->
          <div v-else class="h-full flex flex-col items-center justify-center py-20 opacity-60">
            <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
              <svg class="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h3 class="text-xl font-medium tracking-wide">{{ t('hub.empty.title') }}</h3>
            <p class="text-white/50 mt-2 max-w-sm text-center text-sm">
              {{ t('memories.empty') }}
            </p>
          </div>
        </div>

        <!-- SETTINGS VIEW -->
        <div v-else-if="activeView === 'settings'" class="max-w-2xl mx-auto mt-4 animate-in fade-in zoom-in-95 duration-500">
          <div class="bg-black/20 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
            <h3 class="text-xl font-medium mb-2 text-white/90">{{ t('settings.title') }}</h3>
            <p class="text-sm text-white/50 mb-8 leading-relaxed">{{ t('settings.desc') }}</p>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-white/70 tracking-wide uppercase text-xs">扫描目标管理器 (Scan Targets)</label>
                <button @click="addTarget" class="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg text-xs font-medium border border-indigo-500/30 transition-colors flex items-center gap-1.5">
                  <Folder :size="14" />
                  添加路径
                </button>
              </div>
              
              <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                <div v-for="target in scanTargets" :key="target.id" 
                     class="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                  <div class="flex flex-col min-w-0 flex-1 mr-4">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border border-white/20 bg-white/10" 
                            :class="target.override_tool === 'zcode' ? 'text-indigo-400' : target.override_tool === 'trae' ? 'text-blue-400' : 'text-emerald-400'">
                        {{ target.override_tool || 'Auto' }}
                      </span>
                      <span class="text-[10px] text-white/40">Priority: {{ target.priority }}</span>
                    </div>
                    <span class="text-xs text-white/70 font-mono truncate" :title="target.path">{{ target.path }}</span>
                  </div>
                  
                  <div class="flex items-center gap-2 shrink-0">
                    <button @click="toggleTarget(target.id, !target.is_enabled)" 
                            class="px-3 py-1 rounded text-xs font-medium border transition-colors"
                            :class="target.is_enabled ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-white/20 text-white/40 bg-white/5 hover:bg-white/10'">
                      {{ target.is_enabled ? '已启用' : '已停用' }}
                    </button>
                    <button @click="removeTarget(target.id)" class="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
                
                <div v-if="scanTargets.length === 0" class="text-center py-6 text-white/40 text-sm border border-dashed border-white/10 rounded-xl">
                  当前无扫描目标，将自动侦测默认路径。
                </div>
              </div>
            </div>

            <!-- AI Configuration Section -->
            <div class="pt-8 mt-8 border-t border-white/10">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles :size="16" class="text-indigo-400" />
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-white/90">AI 助手配置</h4>
                  <p class="text-[11px] text-white/40">DeepSeek API 配置，安全存储在本地数据库中</p>
                </div>
              </div>
              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">DeepSeek API Key</label>
                  <input v-model="aiApiKey" type="password" placeholder="sk-xxxxxxxxxxxxxxxx" class="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder-white/20 shadow-inner font-mono" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">模型名称</label>
                  <input v-model="aiModel" type="text" placeholder="deepseek-v4-flash" class="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder-white/20 shadow-inner font-mono" />
                </div>
              </div>
            </div>
            
            <!-- Backup / Restore Section -->
            <div class="pt-8 mt-8 border-t border-white/10">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-white/90">数据备份与恢复</h4>
                  <p class="text-[11px] text-white/40">将全部技能与记忆导出为 JSON 归档，或从归档恢复</p>
                </div>
              </div>
              <div class="flex items-center gap-3 mt-4">
                <button
                  @click="exportAssets"
                  class="px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  导出备份
                </button>
                <button
                  @click="importAssets"
                  class="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  导入恢复
                </button>
              </div>
            </div>

            <div class="flex items-center justify-end pt-8 mt-8 border-t border-white/10">
              <button @click="saveAllConfigs" class="px-6 py-2.5 bg-white text-black font-semibold rounded-xl text-sm hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {{ t('settings.save') }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Welcome / Scan Prompt Overlay -->
      <div v-if="showWelcomePrompt" class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-black/40 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
          <div class="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 border border-indigo-500/30">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h3 class="text-2xl font-semibold mb-3">{{ t('prompt.title') }}</h3>
          <p class="text-white/70 mb-8 leading-relaxed">{{ t('prompt.desc') }}</p>
          <div class="flex justify-end gap-3">
            <button @click="showWelcomePrompt = false" class="px-5 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-transparent">
              {{ t('prompt.cancel') }}
            </button>
            <button @click="scanNow" class="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2">
              <svg v-if="isScanning" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ t('prompt.confirm') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Floating Batch Action Toolbar -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="translate-y-16 opacity-0"
        leave-to-class="translate-y-16 opacity-0"
      >
        <div 
          v-if="isBatchMode && selectedIds.length > 0"
          class="absolute bottom-6 inset-x-8 z-30 flex items-center justify-between px-6 py-3.5 bg-[#161922]/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
        >
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-mono font-medium">
              已选 {{ selectedIds.length }} 项
            </span>
            <span class="text-xs text-white/50">快捷批量执行：</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="batchToggleFavorite(true)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-300 text-xs font-medium transition-colors"
            >
              <Star :size="13" class="fill-current" />
              <span>设为收藏</span>
            </button>
            <button
              @click="batchToggleFavorite(false)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs transition-colors"
            >
              <span>取消收藏</span>
            </button>
            <button
              @click="batchAddTag"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
            >
              <Tag :size="13" />
              <span>追加标签</span>
            </button>
            <button
              @click="batchDelete"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-medium transition-colors"
            >
              <Trash2 :size="13" />
              <span>批量删除</span>
            </button>
          </div>
        </div>
      </Transition>
    </main>
    <SkillDrawer 
      :skill="drawerAsset" 
      :type="drawerType"
      :is-new="drawerIsNew"
      :all-skills="skills"
      :all-memories="memories"
      @close="closeDrawer" 
      @favorite-toggled="handleFavoriteToggled"
      @saved="handleDrawerSaved"
      @deleted="handleDrawerDeleted"
      @select-asset="(asset, type) => openAssetDetail(asset, type)"
      @run-in-ai="(prompt) => openAiChat(prompt)"
    />
    <AiChatPanel 
      :visible="showAiChat" 
      :initial-query="aiInitialQuery"
      :skill-context="aiSkillContext"
      @close="showAiChat = false" 
    />
    <AiKeyPrompt 
      :visible="showAiKeyPrompt" 
      @close="dismissAiPrompt" 
      @saved="handleAiKeySaved" 
    />
    <Toast />
  </div>
</template>
