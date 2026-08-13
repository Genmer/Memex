<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from '../composables/useI18n'
import { Activity, Zap, BookOpen, BarChart3 } from 'lucide-vue-next'

const { t } = useI18n()

interface SourceStat {
  source_tool: string
  count: number
}

const stats = ref({
  total_skills: 0,
  total_memories: 0,
  sources: [] as SourceStat[]
})

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

const sourceColors = [
  { bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/20', text: 'text-blue-300/80', shadow: 'shadow-[0_8px_30px_rgba(59,130,246,0.15)]', icon: 'text-blue-500/20' },
  { bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/20', text: 'text-purple-300/80', shadow: 'shadow-[0_8px_30px_rgba(168,85,247,0.15)]', icon: 'text-purple-500/20' },
  { bg: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-300/80', shadow: 'shadow-[0_8px_30px_rgba(245,158,11,0.15)]', icon: 'text-amber-500/20' },
  { bg: 'from-rose-500/20 to-red-500/10', border: 'border-rose-500/20', text: 'text-rose-300/80', shadow: 'shadow-[0_8px_30px_rgba(244,63,94,0.15)]', icon: 'text-rose-500/20' },
  { bg: 'from-teal-500/20 to-green-500/10', border: 'border-teal-500/20', text: 'text-teal-300/80', shadow: 'shadow-[0_8px_30px_rgba(20,184,166,0.15)]', icon: 'text-teal-500/20' },
]

const getColor = (index: number) => sourceColors[index % sourceColors.length]

// Donut chart data
const donutSegments = computed(() => {
  const total = stats.value.sources.reduce((sum, s) => sum + s.count, 0)
  if (total === 0) return []
  
  const segments: { name: string, count: number, percent: number, offset: number, color: string }[] = []
  let offset = 0
  const strokeColors = ['#6366f1', '#a855f7', '#f59e0b', '#f43f5e', '#14b8a6', '#3b82f6', '#ec4899']
  
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
  fetchStats()
})
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-2xl font-semibold tracking-wide text-white/90 drop-shadow-md">
        {{ t('dashboard.title') }}
      </h3>
      <button @click="fetchStats" class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors border border-white/10 shadow-inner">
        <Activity :size="14" />
        {{ t('dashboard.refresh') }}
      </button>
    </div>

    <!-- Top Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Total Skills -->
      <div class="bg-gradient-to-br from-indigo-500/20 to-purple-500/10 backdrop-blur-xl p-6 rounded-2xl border border-indigo-500/20 shadow-[0_8px_30px_rgba(99,102,241,0.15)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
        <div class="absolute -right-4 -top-4 text-indigo-500/20 group-hover:text-indigo-500/30 transition-colors">
          <Zap :size="120" />
        </div>
        <div class="relative z-10">
          <p class="text-sm font-medium text-indigo-300/80 tracking-widest uppercase mb-2">{{ t('dashboard.totalSkills') }}</p>
          <div class="text-5xl font-bold text-white tracking-tight drop-shadow-lg">{{ stats.total_skills }}</div>
        </div>
      </div>

      <!-- Total Memories -->
      <div class="bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 backdrop-blur-xl p-6 rounded-2xl border border-emerald-500/20 shadow-[0_8px_30px_rgba(16,185,129,0.15)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
        <div class="absolute -right-4 -bottom-4 text-emerald-500/20 group-hover:text-emerald-500/30 transition-colors">
          <BookOpen :size="100" />
        </div>
        <div class="relative z-10">
          <p class="text-sm font-medium text-emerald-300/80 tracking-widest uppercase mb-2">{{ t('dashboard.totalMemories') }}</p>
          <div class="text-5xl font-bold text-white tracking-tight drop-shadow-lg">{{ stats.total_memories }}</div>
        </div>
      </div>
    </div>

    <!-- Per-Source Stats -->
    <div v-if="stats.sources.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div 
        v-for="(source, index) in stats.sources" 
        :key="source.source_tool"
        class="backdrop-blur-xl p-5 rounded-2xl border relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
        :class="[`bg-gradient-to-br ${getColor(index).bg}`, getColor(index).border, getColor(index).shadow]"
      >
        <div class="absolute -right-3 -bottom-3 transition-colors" :class="getColor(index).icon">
          <BarChart3 :size="80" />
        </div>
        <div class="relative z-10">
          <p class="text-sm font-medium tracking-widest uppercase mb-1.5" :class="getColor(index).text">
            {{ source.source_tool.charAt(0).toUpperCase() + source.source_tool.slice(1) }}
          </p>
          <div class="text-3xl font-bold text-white tracking-tight">{{ source.count }}</div>
          <p class="text-xs text-white/40 mt-1">{{ t('dashboard.totalSkills') }}</p>
        </div>
      </div>
    </div>

    <!-- Donut Chart -->
    <div v-if="stats.sources.length" class="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
      <h4 class="text-sm font-medium text-white/50 tracking-widest uppercase mb-6">资产分布</h4>
      <div class="flex items-center justify-center gap-12">
        <!-- SVG Donut -->
        <div class="relative w-48 h-48">
          <svg viewBox="0 0 42 42" class="w-full h-full -rotate-90">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="5" />
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
              class="transition-all duration-700"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-3xl font-bold text-white">{{ stats.total_skills }}</span>
            <span class="text-xs text-white/40">总计</span>
          </div>
        </div>
        
        <!-- Legend -->
        <div class="space-y-3">
          <div v-for="(seg, i) in donutSegments" :key="i" class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: seg.color }"></div>
            <span class="text-sm text-white/70 w-24">{{ seg.name.charAt(0).toUpperCase() + seg.name.slice(1) }}</span>
            <span class="text-sm font-mono text-white/50">{{ seg.count }}</span>
            <span class="text-xs text-white/30">({{ seg.percent.toFixed(1) }}%)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state if no sources -->
    <div v-else class="h-48 bg-black/10 backdrop-blur-md border border-white/5 rounded-2xl flex items-center justify-center shadow-inner">
      <p class="text-white/30 tracking-widest text-sm uppercase flex items-center gap-2">
        <Activity :size="16" />
        {{ t('hub.empty.desc') }}
      </p>
    </div>
  </div>
</template>
