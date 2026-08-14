<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { 
  Search, Terminal, BookOpen, Sparkles, Folder, Download, Upload, 
  Plus, Settings, LayoutDashboard, Command, ArrowRight, CornerDownLeft
} from 'lucide-vue-next'

const props = defineProps<{
  show: boolean,
  skills: any[],
  memories: any[]
}>()

const emit = defineEmits([
  'close', 
  'open-asset', 
  'new-asset', 
  'scan', 
  'export', 
  'import', 
  'navigate',
  'ask-ai'
])

const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

interface ActionItem {
  id: string
  type: 'action'
  title: string
  subtitle?: string
  icon: any
  action: () => void
}

interface AssetResultItem {
  id: string
  type: 'skill' | 'memory'
  asset: any
  title: string
  subtitle: string
  source_tool: string
}

type PaletteItem = ActionItem | AssetResultItem

const standardActions: ActionItem[] = [
  {
    id: 'act-scan',
    type: 'action',
    title: '扫描本地数据 (Scan Local Assets)',
    subtitle: '重新探测本地所有 AI 工具目录与技能',
    icon: Folder,
    action: () => emit('scan')
  },
  {
    id: 'act-new-skill',
    type: 'action',
    title: '新建技能 (New Skill)',
    subtitle: '创建全新的 Prompt 规范或动作技能',
    icon: Plus,
    action: () => emit('new-asset', 'skill')
  },
  {
    id: 'act-new-memory',
    type: 'action',
    title: '新建记忆 (New Memory)',
    subtitle: '手动录入项目规则或全局偏好',
    icon: Plus,
    action: () => emit('new-asset', 'memory')
  },
  {
    id: 'act-ai',
    type: 'action',
    title: '向 AI 助手提问 (Ask AI Assistant)',
    subtitle: '使用 DeepSeek 智能分析技能与记忆库',
    icon: Sparkles,
    action: () => emit('ask-ai', searchQuery.value)
  },
  {
    id: 'act-dashboard',
    type: 'action',
    title: '打开核心大盘 (Dashboard)',
    subtitle: '查看全库资产统计与冲突诊断看板',
    icon: LayoutDashboard,
    action: () => emit('navigate', 'dashboard')
  },
  {
    id: 'act-settings',
    type: 'action',
    title: '打开扫描与系统设置 (Settings)',
    subtitle: '管理扫描路径目标与 AI 配置',
    icon: Settings,
    action: () => emit('navigate', 'settings')
  },
  {
    id: 'act-export',
    type: 'action',
    title: '导出全库归档备份 (Export Backup)',
    subtitle: '将全部技能与记忆导出为 JSON 备份文件',
    icon: Download,
    action: () => emit('export')
  },
  {
    id: 'act-import',
    type: 'action',
    title: '导入归档备份 (Import Backup)',
    subtitle: '从 JSON 归档文件恢复数据到本地库',
    icon: Upload,
    action: () => emit('import')
  }
]

const filteredItems = computed<PaletteItem[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()

  if (!q) {
    // Return standard actions plus top 6 most recent skills
    const recentSkills: PaletteItem[] = (props.skills || []).slice(0, 5).map(s => ({
      id: `skill-${s.id}`,
      type: 'skill',
      asset: s,
      title: s.name,
      subtitle: s.content ? s.content.substring(0, 80).replace(/\n/g, ' ') : '',
      source_tool: s.source_tool || 'custom'
    }))

    return [...standardActions, ...recentSkills]
  }

  // Filter actions
  const matchedActions = standardActions.filter(a => 
    a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))
  )

  // Filter skills
  const matchedSkills: AssetResultItem[] = (props.skills || [])
    .filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.tags && s.tags.toLowerCase().includes(q)) ||
      (s.content && s.content.toLowerCase().includes(q))
    )
    .slice(0, 10)
    .map(s => ({
      id: `skill-${s.id}`,
      type: 'skill',
      asset: s,
      title: s.name,
      subtitle: s.content ? s.content.substring(0, 80).replace(/\n/g, ' ') : '',
      source_tool: s.source_tool || 'custom'
    }))

  // Filter memories
  const matchedMemories: AssetResultItem[] = (props.memories || [])
    .filter(m => 
      m.name.toLowerCase().includes(q) || 
      (m.tags && m.tags.toLowerCase().includes(q)) ||
      (m.content && m.content.toLowerCase().includes(q))
    )
    .slice(0, 10)
    .map(m => ({
      id: `mem-${m.id}`,
      type: 'memory',
      asset: m,
      title: m.name,
      subtitle: m.content ? m.content.substring(0, 80).replace(/\n/g, ' ') : '',
      source_tool: m.source_tool || 'custom'
    }))

  return [...matchedActions, ...matchedSkills, ...matchedMemories]
})

// Auto-focus input when opened
watch(() => props.show, (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    selectedIndex.value = 0
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

// Reset selectedIndex when filter changes
watch(filteredItems, () => {
  selectedIndex.value = 0
})

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.show) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredItems.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredItems.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filteredItems.value[selectedIndex.value]
    if (item) {
      executeItem(item)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

const executeItem = (item: PaletteItem) => {
  if (item.type === 'action') {
    item.action()
  } else {
    emit('open-asset', item.asset, item.type)
  }
  emit('close')
}

const getToolBadgeColor = (tool: string) => {
  const t = tool.toLowerCase()
  if (t.includes('zcode')) return 'text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30'
  if (t.includes('claude')) return 'text-orange-600 dark:text-orange-400 bg-orange-500/15 border-orange-500/30'
  if (t.includes('trae')) return 'text-sky-600 dark:text-sky-400 bg-sky-500/15 border-sky-500/30'
  if (t.includes('agents')) return 'text-teal-600 dark:text-teal-400 bg-teal-500/15 border-teal-500/30'
  return 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 border-indigo-500/30'
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-150 ease-in"
    enter-from-class="opacity-0 scale-95"
    leave-to-class="opacity-0 scale-95"
  >
    <div 
      v-if="show"
      class="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 dark:bg-black/60 backdrop-blur-md"
      @click.self="emit('close')"
      @keydown="handleKeydown"
    >
      <div 
        class="w-full max-w-2xl bg-white/95 dark:bg-[#141720]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[580px] animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Search Input Header -->
        <div class="flex items-center gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <Search :size="18" class="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            placeholder="搜索技能、记忆、工程规则，或输入动作指令..."
            class="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white text-[15px] placeholder:text-slate-400 dark:placeholder:text-white/40 font-normal"
          />
          <div class="flex items-center gap-1 text-[11px] font-mono text-slate-400 dark:text-white/40 px-2 py-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
            <Command :size="11" />
            <span>K</span>
          </div>
        </div>

        <!-- Items Result List -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <template v-if="filteredItems.length">
            <div
              v-for="(item, index) in filteredItems"
              :key="item.id"
              @click="executeItem(item)"
              @mouseenter="selectedIndex = index"
              class="flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all select-none"
              :class="selectedIndex === index ? 'bg-indigo-500/15 dark:bg-indigo-600/30 border border-indigo-500/40 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <!-- Icon -->
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                  :class="item.type === 'action' ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-300' : (item.type === 'skill' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400')"
                >
                  <component :is="item.type === 'action' ? item.icon : (item.type === 'skill' ? Terminal : BookOpen)" :size="15" />
                </div>

                <!-- Text -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm text-slate-800 dark:text-white/90 truncate">{{ item.title }}</span>
                    <span 
                      v-if="item.type !== 'action'" 
                      class="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono font-semibold border"
                      :class="getToolBadgeColor(item.source_tool)"
                    >
                      {{ item.source_tool }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 dark:text-white/40 truncate mt-0.5">{{ item.subtitle }}</p>
                </div>
              </div>

              <!-- Shortcut / Action hint -->
              <div class="shrink-0 flex items-center gap-1.5 pl-3">
                <span v-if="selectedIndex === index" class="text-[11px] text-indigo-600 dark:text-indigo-300 font-mono flex items-center gap-1">
                  <span>执行</span>
                  <CornerDownLeft :size="12" />
                </span>
                <ArrowRight v-else :size="14" class="text-slate-300 dark:text-white/20" />
              </div>
            </div>
          </template>

          <!-- Empty State in Palette -->
          <div v-else class="py-12 flex flex-col items-center justify-center text-center">
            <Sparkles :size="24" class="text-indigo-500 dark:text-indigo-400/60 mb-2" />
            <p class="text-sm text-slate-600 dark:text-white/70">没有找到匹配的结果</p>
            <button 
              @click="emit('ask-ai', searchQuery); emit('close')"
              class="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Sparkles :size="13" />
              在内置 AI 助手中搜索 "{{ searchQuery }}"
            </button>
          </div>
        </div>

        <!-- Footer Hints -->
        <div class="px-5 py-2.5 bg-slate-50 dark:bg-black/40 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400 dark:text-white/40 font-mono">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/70">↑</span>
              <span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/70">↓</span>
              <span>导航</span>
            </span>
            <span class="flex items-center gap-1">
              <span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/70">↵</span>
              <span>打开/执行</span>
            </span>
            <span class="flex items-center gap-1">
              <span class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/70">ESC</span>
              <span>关闭</span>
            </span>
          </div>
          <span>Memex Command Palette</span>
        </div>
      </div>
    </div>
  </Transition>
</template>
