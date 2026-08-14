<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from '../composables/useI18n'
import { Activity, Zap, BookOpen, BarChart3, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-vue-next'

const { t } = useI18n()

interface SourceStat {
  source_tool: string
  count: number
}

interface ConflictReport {
  skill_name: string
  count: number
  sources: string[]
  highest_priority: number
  winning_source: string
  description: string
}

const stats = ref({
  total_skills: 0,
  total_memories: 0,
  sources: [] as SourceStat[]
})

const conflicts = ref<ConflictReport[]>([])
const loadingConflicts = ref(false)

const fetchStats = async () => {
  try {
    stats.value = await invoke('get_stats')
  } catch (error) {
    console.warn('Tauri invoke failed, using mock stats:', error)
    stats.value = {
      total_skills: 4,
      total_memories: 2,
      sources: [
        { source_tool: 'memex_native', count: 1 },
        { source_tool: 'zcode', count: 1 },
        { source_tool: 'claude', count: 1 },
        { source_tool: 'trae', count: 1 }
      ]
    }
  }
}

const fetchConflicts = async () => {
  loadingConflicts.value = true
  try {
    conflicts.value = await invoke('inspect_skill_conflicts')
  } catch (err) {
    console.warn('Conflict check error:', err)
  } finally {
    loadingConflicts.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([fetchStats(), fetchConflicts()])
}

const colors = [
  { bg: 'from-blue-500/20 to-indigo-500/10', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500/20 group-hover:text-blue-500/30' },
  { bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500/20 group-hover:text-purple-500/30' },
  { bg: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500/20 group-hover:text-amber-500/30' },
  { bg: 'from-teal-500/20 to-emerald-500/10', border: 'border-teal-500/20', text: 'text-teal-600 dark:text-teal-400', icon: 'text-teal-500/20 group-hover:text-teal-500/30' },
  { bg: 'from-rose-500/20 to-red-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', icon: 'text-rose-500/20 group-hover:text-rose-500/30' },
  { bg: 'from-sky-500/20 to-blue-500/10', border: 'border-sky-500/20', text: 'text-sky-600 dark:text-sky-400', icon: 'text-sky-500/20 group-hover:text-sky-500/30' },
]

const getColor = (index: number) => colors[index % colors.length]

// Donut Chart calculation
const strokeColors = ['#6366f1', '#a855f7', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e']

const donutSegments = computed(() => {
  const total = stats.value.total_skills
  if (total === 0) return []
  let offset = 0
  const segments: { name: string, percent: number, offset: number, color: string, count: number }[] = []
  stats.value.sources.forEach((s, i) => {
    const percent = (s.count / total) * 100
    segments.push({
      name: s.source_tool,
      count: s.count,
      percent,
      offset,
      color: strokeColors[i % strokeColors.length]
    })
    offset += percent
  })
  return segments
})

onMounted(() => {
  refreshAll()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-2xl font-semibold tracking-wide text-slate-800 dark:text-white/90 drop-shadow-sm">
        {{ t('dashboard.title') }}
      </h3>
      <button @click="refreshAll" class="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-lg text-sm text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200/80 dark:border-white/10 shadow-sm">
        <Activity :size="14" />
        {{ t('dashboard.refresh') }}
      </button>
    </div>

    <!-- Top Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Total Skills -->
      <div class="bg-gradient-to-br from-indigo-500/15 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/10 p-6 rounded-2xl border border-indigo-500/20 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
        <div class="absolute -right-4 -top-4 text-indigo-500/15 dark:text-indigo-500/20 group-hover:text-indigo-500/25 transition-colors">
          <Zap :size="120" />
        </div>
        <div class="relative z-10">
          <p class="text-sm font-medium text-indigo-600 dark:text-indigo-300 tracking-widest uppercase mb-2">{{ t('dashboard.totalSkills') }}</p>
          <div class="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{{ stats.total_skills }}</div>
        </div>
      </div>

      <!-- Total Memories -->
      <div class="bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 dark:from-emerald-500/20 dark:to-cyan-500/10 p-6 rounded-2xl border border-emerald-500/20 shadow-sm relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
        <div class="absolute -right-4 -bottom-4 text-emerald-500/15 dark:text-emerald-500/20 group-hover:text-emerald-500/25 transition-colors">
          <BookOpen :size="100" />
        </div>
        <div class="relative z-10">
          <p class="text-sm font-medium text-emerald-600 dark:text-emerald-300 tracking-widest uppercase mb-2">{{ t('dashboard.totalMemories') }}</p>
          <div class="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{{ stats.total_memories }}</div>
        </div>
      </div>
    </div>

    <!-- Per-Source Stats -->
    <div v-if="stats.sources.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div 
        v-for="(source, index) in stats.sources" 
        :key="source.source_tool"
        class="p-5 rounded-2xl border relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200 shadow-sm"
        :class="[`bg-gradient-to-br ${getColor(index).bg}`, getColor(index).border]"
      >
        <div class="absolute -right-3 -bottom-3 transition-colors" :class="getColor(index).icon">
          <BarChart3 :size="80" />
        </div>
        <div class="relative z-10">
          <p class="text-sm font-medium tracking-widest uppercase mb-1.5" :class="getColor(index).text">
            {{ source.source_tool.charAt(0).toUpperCase() + source.source_tool.slice(1) }}
          </p>
          <div class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{{ source.count }}</div>
          <p class="text-xs text-slate-500 dark:text-white/40 mt-1">{{ t('dashboard.totalSkills') }}</p>
        </div>
      </div>
    </div>

    <!-- Donut Chart & Conflict Diagnostics Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      
      <!-- Donut Chart -->
      <div v-if="stats.sources.length" class="bg-white/80 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
        <h4 class="text-sm font-medium text-slate-500 dark:text-white/50 tracking-widest uppercase mb-6">框架资产分布</h4>
        <div class="flex items-center justify-center gap-10 flex-1">
          <!-- SVG Donut -->
          <div class="relative w-44 h-44 shrink-0">
            <svg viewBox="0 0 42 42" class="w-full h-full -rotate-90">
              <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(150,150,150,0.15)" stroke-width="5" />
              <circle 
                v-for="(seg, i) in donutSegments" 
                :key="i"
                cx="21" cy="21" r="15.9155" 
                fill="none" 
                :stroke="seg.color" 
                stroke-width="5" 
                :stroke-dasharray="`${seg.percent} ${100 - seg.percent}`"
                :stroke-dashoffset="`${-seg.offset}`"
                stroke-linecap="round"
                class="transition-all duration-500"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-bold text-slate-900 dark:text-white">{{ stats.total_skills }}</span>
              <span class="text-xs text-slate-400 dark:text-white/40">总计</span>
            </div>
          </div>
          
          <!-- Legend -->
          <div class="space-y-2.5">
            <div v-for="(seg, i) in donutSegments" :key="i" class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: seg.color }"></div>
              <span class="text-xs text-slate-700 dark:text-white/70 w-24 truncate">{{ seg.name }}</span>
              <span class="text-xs font-mono font-medium text-slate-900 dark:text-white/70">{{ seg.count }}</span>
              <span class="text-[11px] text-slate-400 dark:text-white/30">({{ seg.percent.toFixed(1) }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Health & Conflict Diagnostics Card -->
      <div class="bg-white/80 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 rounded-2xl p-8 shadow-sm flex flex-col">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2.5">
            <ShieldCheck v-if="conflicts.length === 0" :size="18" class="text-emerald-500" />
            <AlertTriangle v-else :size="18" class="text-amber-500" />
            <h4 class="text-sm font-medium text-slate-900 dark:text-white/90 tracking-wider">多源覆盖与冲突诊断</h4>
          </div>
          <button
            @click="fetchConflicts"
            class="text-xs text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
            title="重新诊断"
          >
            <RefreshCw :size="12" :class="{ 'animate-spin': loadingConflicts }" />
            <span>重新检测</span>
          </button>
        </div>

        <div v-if="conflicts.length > 0" class="space-y-3 overflow-y-auto max-h-60 pr-1 flex-1">
          <div
            v-for="c in conflicts"
            :key="c.skill_name"
            class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 leading-relaxed"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium text-slate-900 dark:text-white font-mono">{{ c.skill_name }}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-semibold">
                由 {{ c.winning_source }} 生效
              </span>
            </div>
            <p class="text-[11px] text-slate-600 dark:text-white/60 mb-1.5">{{ c.description }}</p>
            <div class="flex flex-wrap gap-1">
              <span v-for="s in c.sources" :key="s" class="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-black/30 text-slate-600 dark:text-white/50">
                {{ s }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3">
            <ShieldCheck :size="24" />
          </div>
          <p class="text-sm font-medium text-slate-800 dark:text-white/80">全库资产状态健康</p>
          <p class="text-xs text-slate-500 dark:text-white/40 mt-1 max-w-xs">未检测到同名跨源覆盖或未解决的规则冲突，优先级调度正常运作中。</p>
        </div>
      </div>
    </div>

    <!-- Empty state if no sources -->
    <div v-if="stats.sources.length === 0" class="h-48 bg-white/50 dark:bg-black/10 border border-slate-200/80 dark:border-white/5 rounded-2xl flex items-center justify-center shadow-inner">
      <p class="text-slate-400 dark:text-white/30 tracking-widest text-sm uppercase flex items-center gap-2">
        <Activity :size="16" />
        {{ t('hub.empty.desc') }}
      </p>
    </div>
  </div>
</template>
