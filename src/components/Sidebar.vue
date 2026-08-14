<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  Folder, 
  Database, 
  Code, 
  Settings, 
  ChevronRight, 
  Zap, 
  Globe, 
  Package, 
  Pin, 
  Tag, 
  X, 
  Sun, 
  Moon, 
  Monitor, 
  BookOpen, 
  Sparkles, 
  CheckSquare, 
  Calendar, 
  Star, 
  Layers, 
  FileText,
  Bot
} from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'

const props = withDefaults(defineProps<{
  uniqueSources: string[],
  pinnedSources?: string[],
  allTags?: { name: string, count: number }[],
  selectedTag?: string | null,
  workspaceMode?: 'agent' | 'memo',
  memoFolders?: { name: string, count: number }[],
  memoTags?: { name: string, count: number }[],
  selectedMemoFolder?: string | null,
  selectedMemoTag?: string | null,
  selectedMemoFilter?: string | null
}>(), {
  workspaceMode: 'agent',
  memoFolders: () => [],
  memoTags: () => []
})

const emit = defineEmits([
  'select', 
  'toggle-pin', 
  'select-tag',
  'update:workspaceMode',
  'select-memo-folder',
  'select-memo-tag',
  'select-memo-filter'
])

const { t, toggleLanguage } = useI18n()
const { themeMode, setThemeMode } = useTheme()

const menu = computed(() => {
  const base = [
    {
      id: 'core',
      name: t('sidebar.coreSystem'),
      icon: Settings,
      isGroup: true,
      isPinned: false,
      children: [
        { id: 'dashboard', name: t('sidebar.dashboard') },
        { id: 'ai-stats', name: t('sidebar.aiStats') },
        { id: 'settings', name: t('sidebar.settings') }
      ]
    }
  ]

  const pinnedList = props.pinnedSources || []
  
  const sources = (props.uniqueSources || [])
    .map(source => {
      let icon = Code
      if (source === 'claude') icon = Database
      if (source === 'hermes' || source === 'agents') icon = Folder
      if (source === 'codebuddy') icon = Package

      return {
        id: source,
        name: source.charAt(0).toUpperCase() + source.slice(1),
        icon: icon,
        isGroup: false,
        isPinned: pinnedList.includes(source),
        children: [
          { id: `${source}-skills`, name: t('sidebar.skills') },
          { id: `${source}-memories`, name: t('sidebar.memories') }
        ]
      }
    })
    
  sources.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.name.localeCompare(b.name);
  })

  const end = [
    {
      id: 'memex',
      name: t('sidebar.memexNative'),
      icon: Zap,
      isGroup: true,
      isPinned: false,
      children: [
        { id: 'memex-skills', name: t('sidebar.skills') }
      ]
    }
  ]

  return [...base, ...sources, ...end]
})

const expanded = ref<Record<string, boolean>>({
  'core': true,
  'zcode': true,
  'claude': true,
  'tags': true,
  'memo-folders': true,
  'memo-tags': true
})

watch(() => props.uniqueSources, (newSources) => {
  if (newSources) {
    newSources.forEach(s => {
      if (expanded.value[s] === undefined) {
        expanded.value[s] = true
      }
    })
  }
}, { immediate: true })

const activeItem = ref('dashboard')

const toggleGroup = (id: string) => {
  expanded.value[id] = !expanded.value[id]
}

const selectItem = (id: string) => {
  activeItem.value = id
  emit('select', id)
}

const handleTagClick = (tagName: string) => {
  if (props.selectedTag === tagName) {
    emit('select-tag', null)
  } else {
    emit('select-tag', tagName)
  }
}

const setMode = (mode: 'agent' | 'memo') => {
  emit('update:workspaceMode', mode)
}
</script>

<template>
  <div class="app-sidebar w-64 h-screen flex flex-col bg-white/5 backdrop-blur-3xl border-r border-white/10 shrink-0 select-none transition-colors duration-200">
    <!-- Header Logo -->
    <div class="h-14 flex items-center justify-between px-5 border-b border-white/5 shrink-0">
      <div class="flex items-center">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg text-sm mr-2.5">
          M
        </div>
        <span class="font-semibold text-base tracking-wide text-white/90">{{ t('app.title') }}</span>
      </div>
      <span class="text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/5">v0.1.0</span>
    </div>

    <!-- Workspace Mode Switcher (Agent 武器库 vs 备忘与日志) -->
    <div class="p-3 border-b border-white/5 bg-black/10">
      <div class="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
        <button 
          @click="setMode('agent')"
          class="flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
          :class="workspaceMode === 'agent' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/50 hover:text-white'"
          title="切换至 Agent 技能与资产模式"
        >
          <Bot :size="13" />
          <span>Agent 武器库</span>
        </button>
        <button 
          @click="setMode('memo')"
          class="flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
          :class="workspaceMode === 'memo' ? 'bg-indigo-600 text-white shadow-md font-bold' : 'text-white/50 hover:text-white'"
          title="切换至个人备忘录与工作日志模式"
        >
          <BookOpen :size="13" />
          <span>备忘与日志</span>
        </button>
      </div>
    </div>

    <!-- ================= AGENT WORKSPACE MENU ================= -->
    <div v-if="workspaceMode === 'agent'" class="flex-1 overflow-y-auto p-4 space-y-6">
      <div v-for="group in menu" :key="group.id" class="space-y-1">
        <div 
          @click="toggleGroup(group.id)"
          class="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-white/50 hover:text-white/80 cursor-pointer transition-colors uppercase tracking-wider group"
        >
          <div class="flex items-center gap-2">
            <component :is="group.icon" :size="14" />
            {{ group.name }}
          </div>
          <div class="flex items-center gap-1.5">
            <button 
              v-if="!group.isGroup" 
              @click.stop="emit('toggle-pin', group.id)" 
              class="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 p-0.5 rounded"
              :class="{ 'opacity-100 text-indigo-400': group.isPinned, 'hover:bg-white/10': !group.isPinned }"
              :title="group.isPinned ? 'Unpin' : 'Pin to top'"
            >
              <Pin :size="12" :class="{ 'fill-current': group.isPinned }" />
            </button>
            <ChevronRight 
              :size="14" 
              class="transition-transform duration-200 text-white/40"
              :class="{ 'rotate-90': expanded[group.id] }"
            />
          </div>
        </div>
        
        <div v-show="expanded[group.id]" class="space-y-0.5 pt-1">
          <div 
            v-for="child in group.children" 
            :key="child.id"
            @click="selectItem(child.id)"
            class="px-8 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150"
            :class="[
              activeItem === child.id 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'text-white/60 hover:text-white/90 hover:bg-white/5 border border-transparent'
            ]"
          >
            {{ child.name }}
          </div>
        </div>
      </div>

      <!-- Tag Cloud Section -->
      <div v-if="allTags && allTags.length > 0" class="pt-4 border-t border-white/5 space-y-2">
        <div 
          @click="toggleGroup('tags')"
          class="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-white/50 hover:text-white/80 cursor-pointer transition-colors uppercase tracking-wider"
        >
          <div class="flex items-center gap-2">
            <Tag :size="14" />
            标签检索 (Tags)
          </div>
          <div class="flex items-center gap-1">
            <button 
              v-if="selectedTag" 
              @click.stop="emit('select-tag', null)"
              class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] hover:bg-indigo-500/30 flex items-center gap-0.5"
              title="Clear Tag Filter"
            >
              清除 <X :size="10" />
            </button>
            <ChevronRight 
              :size="14" 
              class="transition-transform duration-200 text-white/40"
              :class="{ 'rotate-90': expanded['tags'] }"
            />
          </div>
        </div>

        <div v-show="expanded['tags']" class="flex flex-wrap gap-1.5 px-2 pt-1">
          <button 
            v-for="tagItem in allTags.slice(0, 20)" 
            :key="tagItem.name"
            @click="handleTagClick(tagItem.name)"
            class="px-2 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 border"
            :class="[
              selectedTag === tagItem.name
                ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 shadow-sm shadow-indigo-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 border-white/5'
            ]"
          >
            <span>{{ tagItem.name }}</span>
            <span class="text-[10px] opacity-50">{{ tagItem.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MEMO & JOURNAL WORKSPACE MENU ================= -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- Quick Views -->
      <div class="space-y-1">
        <div class="px-2 py-1.5 text-xs font-medium text-white/50 uppercase tracking-wider flex items-center gap-2">
          <Sparkles :size="13" />
          <span>快捷视图</span>
        </div>

        <div class="space-y-0.5 pt-1">
          <div 
            @click="emit('select-memo-filter', null); emit('select-memo-folder', null); emit('select-memo-tag', null)"
            class="px-4 py-2 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between"
            :class="!selectedMemoFilter && !selectedMemoFolder && !selectedMemoTag ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'"
          >
            <span class="flex items-center gap-2">
              <FileText :size="13" />
              <span>全部备忘</span>
            </span>
          </div>

          <div 
            @click="emit('select-memo-filter', 'pinned')"
            class="px-4 py-2 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between"
            :class="selectedMemoFilter === 'pinned' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'"
          >
            <span class="flex items-center gap-2">
              <Pin :size="13" class="text-amber-400" />
              <span>置顶备忘</span>
            </span>
          </div>

          <div 
            @click="emit('select-memo-filter', 'favorite')"
            class="px-4 py-2 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between"
            :class="selectedMemoFilter === 'favorite' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'"
          >
            <span class="flex items-center gap-2">
              <Star :size="13" class="text-amber-400" />
              <span>收藏备忘</span>
            </span>
          </div>

          <div 
            @click="emit('select-memo-filter', 'todo')"
            class="px-4 py-2 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between"
            :class="selectedMemoFilter === 'todo' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'"
          >
            <span class="flex items-center gap-2">
              <CheckSquare :size="13" class="text-emerald-400" />
              <span>待办任务</span>
            </span>
          </div>

          <div 
            @click="emit('select-memo-filter', 'journal')"
            class="px-4 py-2 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between"
            :class="selectedMemoFilter === 'journal' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'"
          >
            <span class="flex items-center gap-2">
              <Calendar :size="13" class="text-purple-400" />
              <span>每日日志</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Memo Folders Section -->
      <div v-if="memoFolders && memoFolders.length > 0" class="pt-4 border-t border-white/5 space-y-2">
        <div 
          @click="toggleGroup('memo-folders')"
          class="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-white/50 hover:text-white/80 cursor-pointer transition-colors uppercase tracking-wider"
        >
          <div class="flex items-center gap-2">
            <Layers :size="14" />
            <span>分类文件夹</span>
          </div>
          <ChevronRight 
            :size="14" 
            class="transition-transform duration-200 text-white/40"
            :class="{ 'rotate-90': expanded['memo-folders'] }"
          />
        </div>

        <div v-show="expanded['memo-folders']" class="space-y-0.5 pt-1">
          <div 
            v-for="folder in memoFolders" 
            :key="folder.name"
            @click="emit('select-memo-folder', folder.name)"
            class="px-4 py-1.5 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between"
            :class="[
              selectedMemoFolder === folder.name 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium' 
                : 'text-white/60 hover:text-white/90 hover:bg-white/5'
            ]"
          >
            <span class="truncate">{{ folder.name }}</span>
            <span class="text-[10px] font-mono opacity-50">{{ folder.count }}</span>
          </div>
        </div>
      </div>

      <!-- Memo Tags Section -->
      <div v-if="memoTags && memoTags.length > 0" class="pt-4 border-t border-white/5 space-y-2">
        <div 
          @click="toggleGroup('memo-tags')"
          class="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-white/50 hover:text-white/80 cursor-pointer transition-colors uppercase tracking-wider"
        >
          <div class="flex items-center gap-2">
            <Tag :size="14" />
            <span>备忘标签</span>
          </div>
          <ChevronRight 
            :size="14" 
            class="transition-transform duration-200 text-white/40"
            :class="{ 'rotate-90': expanded['memo-tags'] }"
          />
        </div>

        <div v-show="expanded['memo-tags']" class="flex flex-wrap gap-1.5 px-2 pt-1">
          <button 
            v-for="tag in memoTags" 
            :key="tag.name"
            @click="emit('select-memo-tag', selectedMemoTag === tag.name ? null : tag.name)"
            class="px-2 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 border"
            :class="[
              selectedMemoTag === tag.name
                ? 'bg-purple-500/30 border-purple-400 text-purple-200 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/5'
            ]"
          >
            <span>#{{ tag.name }}</span>
            <span class="text-[10px] opacity-50">{{ tag.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer Theme Switcher & Language -->
    <div class="p-3 border-t border-white/5 shrink-0 bg-black/10 flex items-center justify-between gap-2">
      <!-- Theme 3-way toggle -->
      <div class="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
        <button 
          @click="setThemeMode('light')"
          class="px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1"
          :class="themeMode === 'light' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-white/40 hover:text-white/80'"
          title="浅色模式 (Light)"
        >
          <Sun :size="13" />
        </button>
        <button 
          @click="setThemeMode('dark')"
          class="px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1"
          :class="themeMode === 'dark' ? 'bg-indigo-600 text-white shadow-sm font-medium' : 'text-white/40 hover:text-white/80'"
          title="深色模式 (Dark)"
        >
          <Moon :size="13" />
        </button>
        <button 
          @click="setThemeMode('auto')"
          class="px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1"
          :class="themeMode === 'auto' ? 'bg-white/20 text-white shadow-sm font-medium' : 'text-white/40 hover:text-white/80'"
          title="跟随系统 (Auto)"
        >
          <Monitor :size="13" />
        </button>
      </div>

      <button @click="toggleLanguage" class="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors" title="切换语言 / Toggle Language">
        <Globe :size="15" />
      </button>
    </div>
  </div>
</template>
