<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { 
  Flame, 
  MessageSquare, 
  FileText, 
  Calendar, 
  CalendarDays, 
  Zap, 
  RefreshCw, 
  Trash2, 
  Search,
  TrendingUp,
  Cpu,
  Clock
} from 'lucide-vue-next'
import { useToast } from '../composables/useToast'
import { gitliteDb } from '../services/gitliteDb'

const toast = useToast()

const activeTab = ref<'app' | 'plan'>('app')
const timeRange = ref<'7d' | '30d' | 'all'>('30d')
const isLoading = ref(false)
const searchQuery = ref('')
const selectedActionFilter = ref('all')

const stats = ref<any>({
  total_tokens: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
  total_calls: 0,
  total_skills_analyzed: 0,
  active_days: 0,
  streak_days: 0,
  top_model: '无',
  top_model_ratio: 0,
  heatmap_data: [],
  daily_trends: [],
  model_breakdown: []
})

const logs = ref<any[]>([])

const formatTokens = (val: number) => {
  if (!val || val === 0) return '0'
  if (val >= 100_000_000) return `${(val / 100_000_000).toFixed(1)}亿`
  if (val >= 10_000_000) return `${(val / 10_000).toFixed(0)}万`
  if (val >= 10_000) return `${(val / 10_000).toFixed(1)}万`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`
  return val.toLocaleString()
}

const formatNumber = (val: number) => {
  if (!val) return '0'
  return val.toLocaleString()
}

const loadData = async () => {
  isLoading.value = true
  try {
    let statsData: any = await gitliteDb.getAiUsageDashboardStats()
    let logsData: any = await gitliteDb.getAiUsageLogs(100)

    if ((!logsData || logsData.length === 0) && (!statsData || statsData.total_tokens === 0)) {
      try {
        statsData = await invoke('get_ai_usage_stats', { timeRange: timeRange.value })
        logsData = await invoke('get_ai_usage_logs', {
          limit: 100,
          offset: 0,
          actionType: selectedActionFilter.value === 'all' ? null : selectedActionFilter.value
        })
      } catch (e) {}
    }

    stats.value = statsData || stats.value
    logs.value = logsData || []
  } catch (err: any) {
    toast.error('加载统计数据失败: ' + err)
  } finally {
    isLoading.value = false
  }
}

const clearLogs = async () => {
  if (!confirm('确定要清空所有 AI Token 消耗历史记录吗？此操作不可恢复。')) return
  try {
    await gitliteDb.clearAiUsageLogs()
    invoke('clear_ai_usage_logs').catch(() => {})
    toast.success('已清空使用日志 (GitLite 同步)')
    await loadData()
  } catch (err: any) {
    toast.error('清空失败: ' + err)
  }
}


watch([timeRange, selectedActionFilter], () => {
  loadData()
})

onMounted(() => {
  loadData()
})

const filteredLogs = computed(() => {
  if (!searchQuery.value.trim()) return logs.value
  const q = searchQuery.value.trim().toLowerCase()
  return logs.value.filter(l => 
    (l.target_name && l.target_name.toLowerCase().includes(q)) ||
    (l.model && l.model.toLowerCase().includes(q)) ||
    (l.action_type && l.action_type.toLowerCase().includes(q))
  )
})

const maxTrendTokens = computed(() => {
  if (!stats.value.daily_trends?.length) return 100
  const max = Math.max(...stats.value.daily_trends.map((d: any) => d.total_tokens))
  return max > 0 ? max : 100
})

const getModelColor = (modelName: string) => {
  const found = stats.value.model_breakdown?.find((m: any) => m.model === modelName)
  if (found) return found.color
  if (modelName.includes('v4') || modelName.includes('flash')) return '#10B981'
  if (modelName.includes('chat')) return '#3B82F6'
  if (modelName.includes('reasoner')) return '#8B5CF6'
  return '#F59E0B'
}

// Donut chart SVG path computation
const donutSlices = computed(() => {
  const breakdown = stats.value.model_breakdown || []
  if (!breakdown.length || stats.value.total_tokens === 0) return []

  let cumulativeAngle = 0
  const radius = 40
  const circumference = 2 * Math.PI * radius

  return breakdown.map((item: any) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((cumulativeAngle / 100) * circumference)
    cumulativeAngle += item.percentage
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset
    }
  })
})

const getActionLabel = (action: string) => {
  switch (action) {
    case 'skill_analysis': return '技能单项解析'
    case 'batch_skill_analysis': return '批量技能解析'
    case 'category_synthesis': return '分类全景画像'
    case 'ai_chat': return 'AI 助手对话'
    case 'config_fix': return '环境热修复'
    default: return action
  }
}

const getActionBadgeClass = (action: string) => {
  switch (action) {
    case 'skill_analysis': return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
    case 'batch_skill_analysis': return 'bg-purple-500/15 text-purple-300 border-purple-500/25'
    case 'category_synthesis': return 'bg-pink-500/15 text-pink-300 border-pink-500/25'
    case 'ai_chat': return 'bg-blue-500/15 text-blue-300 border-blue-500/25'
    case 'config_fix': return 'bg-amber-500/15 text-amber-300 border-amber-500/25'
    default: return 'bg-white/10 text-white/70 border-white/10'
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-16">
    <!-- Top Header -->
    <div class="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
      <div>
        <div class="flex items-center gap-4">
          <h2 class="text-2xl font-bold text-white tracking-tight">使用统计</h2>
          <div class="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              @click="activeTab = 'app'"
              class="px-3.5 py-1 rounded-lg text-xs font-semibold transition-all"
              :class="activeTab === 'app' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'"
            >
              应用用量
            </button>
            <button 
              @click="activeTab = 'plan'"
              class="px-3.5 py-1 rounded-lg text-xs font-semibold transition-all"
              :class="activeTab === 'plan' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/50 hover:text-white'"
            >
              个人套餐 & 配置
            </button>
          </div>
        </div>
        <p class="text-xs text-white/40 mt-1">
          实时监控大模型调用频次、Token 消耗流向与各项技能解析账单明细
        </p>
      </div>

      <!-- Time Range Pills & Refresh -->
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-medium">
          <button 
            @click="timeRange = '7d'"
            class="px-3 py-1 rounded-lg transition-all"
            :class="timeRange === '7d' ? 'bg-white/15 text-white font-semibold' : 'text-white/50 hover:text-white'"
          >
            最近 7 天
          </button>
          <button 
            @click="timeRange = '30d'"
            class="px-3 py-1 rounded-lg transition-all"
            :class="timeRange === '30d' ? 'bg-white/15 text-white font-semibold' : 'text-white/50 hover:text-white'"
          >
            最近 30 天
          </button>
          <button 
            @click="timeRange = 'all'"
            class="px-3 py-1 rounded-lg transition-all"
            :class="timeRange === 'all' ? 'bg-white/15 text-white font-semibold' : 'text-white/50 hover:text-white'"
          >
            全部时间
          </button>
        </div>

        <button 
          @click="loadData"
          class="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors"
          title="刷新统计数据"
        >
          <RefreshCw :size="15" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- ================= APP USAGE TAB ================= -->
    <div v-if="activeTab === 'app'" class="space-y-6">
      <!-- 6 KPI Stat Cards Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <!-- Tokens 用量 -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div class="flex items-center gap-1.5 text-xs text-white/50 mb-2">
            <Flame :size="14" class="text-amber-400" />
            <span>tokens 用量</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-white tracking-tight font-sans">
              {{ formatTokens(stats.total_tokens) }}
            </div>
            <div class="text-[10px] text-white/40 font-mono mt-1 truncate" :title="`输入: ${formatTokens(stats.prompt_tokens)} · 输出: ${formatTokens(stats.completion_tokens)}`">
              入: {{ formatTokens(stats.prompt_tokens) }} · 出: {{ formatTokens(stats.completion_tokens) }}
            </div>
          </div>
        </div>

        <!-- 会话/调用次数 -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div class="flex items-center gap-1.5 text-xs text-white/50 mb-2">
            <MessageSquare :size="14" class="text-blue-400" />
            <span>调用次数</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-white tracking-tight font-sans">
              {{ formatNumber(stats.total_calls) }}
            </div>
            <div class="text-[10px] text-white/40 font-mono mt-1">
              总计 AI 请求频次
            </div>
          </div>
        </div>

        <!-- 技能解析数 -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div class="flex items-center gap-1.5 text-xs text-white/50 mb-2">
            <FileText :size="14" class="text-purple-400" />
            <span>技能解析数</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-white tracking-tight font-sans">
              {{ formatNumber(stats.total_skills_analyzed) }}
            </div>
            <div class="text-[10px] text-purple-300/60 font-mono mt-1">
              已提炼中文释义
            </div>
          </div>
        </div>

        <!-- 活跃天数 -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div class="flex items-center gap-1.5 text-xs text-white/50 mb-2">
            <Calendar :size="14" class="text-emerald-400" />
            <span>活跃天数</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-white tracking-tight font-sans">
              {{ stats.active_days }}
            </div>
            <div class="text-[10px] text-emerald-300/60 font-mono mt-1">
              期间有调用天数
            </div>
          </div>
        </div>

        <!-- 当前连续天数 -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div class="flex items-center gap-1.5 text-xs text-white/50 mb-2">
            <CalendarDays :size="14" class="text-pink-400" />
            <span>当前连续天数</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-white tracking-tight font-sans">
              {{ stats.streak_days }}
            </div>
            <div class="text-[10px] text-pink-300/60 font-mono mt-1">
              天连续活跃
            </div>
          </div>
        </div>

        <!-- 最常用模型 -->
        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-sm">
          <div class="flex items-center gap-1.5 text-xs text-white/50 mb-2">
            <Zap :size="14" class="text-indigo-400" />
            <span>最常用模型</span>
          </div>
          <div class="min-w-0">
            <div class="text-base font-bold text-white tracking-tight truncate" :title="stats.top_model">
              {{ stats.top_model }}
            </div>
            <div class="text-[10px] text-indigo-300/80 font-mono mt-1">
              占比 {{ stats.top_model_ratio }}%
            </div>
          </div>
        </div>
      </div>

      <!-- Activity Heatmap Card -->
      <div class="p-6 rounded-2xl bg-white/[0.02] border border-white/10 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-white/90">活跃热力图</h3>
            <span class="text-xs text-white/40 font-mono">（最近 {{ stats.heatmap_data?.length || 0 }} 天）</span>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-1.5 text-xs text-white/40 font-mono">
            <span>较少</span>
            <span class="w-3 h-3 rounded-sm bg-white/5 border border-white/10"></span>
            <span class="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500/40"></span>
            <span class="w-3 h-3 rounded-sm bg-indigo-500/60 border border-indigo-500/70"></span>
            <span class="w-3 h-3 rounded-sm bg-indigo-500 border border-indigo-400"></span>
            <span class="w-3 h-3 rounded-sm bg-blue-400 border border-blue-300"></span>
            <span>较多</span>
          </div>
        </div>

        <!-- Heatmap Grid -->
        <div class="overflow-x-auto pb-2">
          <div class="flex gap-1.5 min-w-max">
            <div 
              v-for="item in stats.heatmap_data" 
              :key="item.date"
              class="w-3.5 h-3.5 rounded-sm transition-all duration-150 cursor-pointer group relative"
              :class="[
                item.level === 0 ? 'bg-white/5 hover:border-white/40 border border-white/5' :
                item.level === 1 ? 'bg-indigo-500/30 hover:bg-indigo-500/45 border border-indigo-500/40' :
                item.level === 2 ? 'bg-indigo-500/60 hover:bg-indigo-500/75 border border-indigo-500/70' :
                item.level === 3 ? 'bg-indigo-500 hover:bg-indigo-400 border border-indigo-400' :
                'bg-blue-400 hover:bg-blue-300 border border-blue-300 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
              ]"
            >
              <!-- Tooltip on hover -->
              <div class="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/90 text-white text-[10px] font-mono whitespace-nowrap z-30 shadow-xl border border-white/10 transition-opacity">
                {{ item.date }}: {{ item.count }} 次调用 ({{ formatTokens(item.tokens) }} tokens)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Two-Column Section: Daily Token Trends & Model Usage Donut -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Daily Token Trends (2 columns wide) -->
        <div class="lg:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/10 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <TrendingUp :size="16" class="text-indigo-400" />
              <h3 class="text-sm font-semibold text-white/90">按天 Token 趋势</h3>
            </div>
            <span class="text-xs text-white/40 font-mono">每日各模型累计消耗</span>
          </div>

          <!-- Stacked Bar Chart Area -->
          <div class="h-56 flex items-end gap-2 pt-6 pb-4 px-2 border-b border-white/5 overflow-x-auto">
            <div 
              v-for="day in stats.daily_trends" 
              :key="day.date" 
              class="flex-1 min-w-[24px] flex flex-col items-center gap-1 group relative h-full justify-end"
            >
              <!-- Tooltip on Hover -->
              <div class="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-2 px-3 py-1.5 rounded-xl bg-black/95 text-white text-[11px] font-mono whitespace-nowrap z-30 shadow-2xl border border-white/15 transition-opacity space-y-1">
                <div class="font-bold text-white/90 border-b border-white/10 pb-0.5">{{ day.date }}</div>
                <div v-for="(tok, mdl) in day.models" :key="mdl" class="flex items-center justify-between gap-3 text-[10px]">
                  <span class="flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getModelColor(mdl as string) }"></span>
                    <span class="text-white/70">{{ mdl }}:</span>
                  </span>
                  <span class="font-bold text-white">{{ formatTokens(tok) }}</span>
                </div>
                <div class="text-indigo-300 font-bold pt-0.5 border-t border-white/10 flex justify-between">
                  <span>总计:</span>
                  <span>{{ formatTokens(day.total_tokens) }}</span>
                </div>
              </div>

              <!-- Bar Pillar (Stacked) -->
              <div class="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all group-hover:opacity-90 bg-white/5" :style="{ height: `${Math.max(4, (day.total_tokens / maxTrendTokens) * 100)}%` }">
                <div 
                  v-for="(tok, mdl) in day.models" 
                  :key="mdl"
                  class="w-full transition-all"
                  :style="{ 
                    height: `${(tok / (day.total_tokens || 1)) * 100}%`,
                    backgroundColor: getModelColor(mdl as string)
                  }"
                ></div>
              </div>

              <!-- X-Axis Date Label -->
              <span class="text-[9px] text-white/40 font-mono truncate w-full text-center mt-1">
                {{ day.display_date }}
              </span>
            </div>
          </div>

          <!-- Model Legend below chart -->
          <div class="flex flex-wrap items-center gap-4 pt-1 text-xs text-white/70">
            <div 
              v-for="item in stats.model_breakdown" 
              :key="item.model"
              class="flex items-center gap-1.5 text-xs font-mono"
            >
              <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: item.color }"></span>
              <span>{{ item.model }}</span>
            </div>
          </div>
        </div>

        <!-- Model Breakdown Donut Chart (1 column wide) -->
        <div class="p-6 rounded-2xl bg-white/[0.02] border border-white/10 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white/90 flex items-center gap-2">
              <Cpu :size="16" class="text-indigo-400" />
              <span>模型用量占比</span>
            </h3>
            <span class="text-xs text-white/40 font-mono">{{ stats.model_breakdown?.length || 0 }} 款模型</span>
          </div>

          <!-- SVG Donut Chart -->
          <div class="flex items-center justify-center my-2 relative">
            <svg class="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
              <!-- Background Track -->
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                stroke-width="14"
              />
              <!-- Donut Slices -->
              <circle
                v-for="slice in donutSlices"
                :key="slice.model"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                :stroke="slice.color"
                stroke-width="14"
                :stroke-dasharray="slice.strokeDasharray"
                :stroke-dashoffset="slice.strokeDashoffset"
                class="transition-all duration-500 hover:stroke-width-[16]"
              />
            </svg>
            <!-- Center Total Display -->
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <div class="text-lg font-bold text-white font-sans leading-tight">
                {{ formatTokens(stats.total_tokens) }}
              </div>
              <div class="text-[10px] text-white/40 font-mono">tokens</div>
            </div>
          </div>

          <!-- Breakdown List -->
          <div class="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            <div 
              v-for="item in stats.model_breakdown" 
              :key="item.model"
              class="flex items-center justify-between text-xs"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: item.color }"></span>
                <span class="font-medium text-white/90 truncate font-mono text-xs" :title="item.model">{{ item.model }}</span>
              </div>
              <div class="text-right shrink-0">
                <span class="font-mono text-white/90 font-semibold">{{ formatTokens(item.tokens) }}</span>
                <span class="text-white/40 ml-1.5 font-mono text-[11px]">({{ item.percentage }}%)</span>
              </div>
            </div>

            <div v-if="!stats.model_breakdown?.length" class="text-center py-4 text-xs text-white/40">
              暂无模型用量数据
            </div>
          </div>
        </div>
      </div>

      <!-- ================= DETAILED USAGE LOGS TABLE ================= -->
      <div class="p-6 rounded-2xl bg-white/[0.02] border border-white/10 shadow-sm space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 class="text-sm font-semibold text-white/90 flex items-center gap-2">
              <Clock :size="16" class="text-indigo-400" />
              <span>AI 调用与 Token 消耗流水明细</span>
            </h3>
            <p class="text-xs text-white/40 mt-0.5">
              记录每次单项技能提炼、批量解析与分类全景画像生成的实际输入/输出消耗与延迟
            </p>
          </div>

          <!-- Action Type Filter, Search & Clear -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="relative">
              <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="搜索技能名 / 模型..." 
                class="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 w-44"
              />
            </div>

            <select 
              v-model="selectedActionFilter"
              class="px-3 py-1.5 bg-[#161922] border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="all">全场景类型</option>
              <option value="skill_analysis">技能单项解析</option>
              <option value="batch_skill_analysis">批量技能提炼</option>
              <option value="category_synthesis">分类全景画像</option>
              <option value="ai_chat">AI 助手对话</option>
            </select>

            <button 
              @click="clearLogs"
              class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs transition-colors flex items-center gap-1.5"
              title="清空所有记录"
            >
              <Trash2 :size="13" />
              <span>清空记录</span>
            </button>
          </div>
        </div>

        <!-- Logs Table -->
        <div class="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/5 text-white/60 font-mono text-[11px] uppercase border-b border-white/5">
              <tr>
                <th class="py-3 px-4">调用时间</th>
                <th class="py-3 px-4">场景类型</th>
                <th class="py-3 px-4">目标资产 / 描述</th>
                <th class="py-3 px-4">模型</th>
                <th class="py-3 px-4 text-right">输入 (Prompt)</th>
                <th class="py-3 px-4 text-right">输出 (Compl)</th>
                <th class="py-3 px-4 text-right">总 Token</th>
                <th class="py-3 px-4 text-right">耗时</th>
                <th class="py-3 px-4 text-center">状态</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr 
                v-for="log in filteredLogs" 
                :key="log.id"
                class="hover:bg-white/[0.04] transition-colors"
              >
                <td class="py-2.5 px-4 font-mono text-white/50 text-[11px] whitespace-nowrap">
                  {{ log.created_at }}
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-medium border font-sans" :class="getActionBadgeClass(log.action_type)">
                    {{ getActionLabel(log.action_type) }}
                  </span>
                </td>
                <td class="py-2.5 px-4 font-medium text-white/90 max-w-xs truncate" :title="log.target_name || '-'">
                  {{ log.target_name || '-' }}
                </td>
                <td class="py-2.5 px-4 font-mono text-xs text-white/70 whitespace-nowrap">
                  <span class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getModelColor(log.model) }"></span>
                    <span>{{ log.model }}</span>
                  </span>
                </td>
                <td class="py-2.5 px-4 text-right font-mono text-white/60">
                  {{ formatTokens(log.prompt_tokens) }}
                </td>
                <td class="py-2.5 px-4 text-right font-mono text-white/60">
                  {{ formatTokens(log.completion_tokens) }}
                </td>
                <td class="py-2.5 px-4 text-right font-mono font-bold text-indigo-300">
                  {{ formatTokens(log.total_tokens) }}
                </td>
                <td class="py-2.5 px-4 text-right font-mono text-white/50 text-[11px]">
                  {{ (log.duration_ms / 1000).toFixed(2) }}s
                </td>
                <td class="py-2.5 px-4 text-center">
                  <span 
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    :class="log.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'"
                    :title="log.error_message || '成功'"
                  >
                    {{ log.status === 'success' ? '成功' : '失败' }}
                  </span>
                </td>
              </tr>

              <tr v-if="!filteredLogs.length">
                <td colspan="9" class="py-8 text-center text-white/40 text-xs font-sans">
                  暂无匹配的 AI Token 调用明细记录
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ================= PLAN & CONFIG TAB ================= -->
    <div v-else class="space-y-6">
      <div class="p-6 rounded-2xl bg-white/[0.02] border border-white/10 shadow-sm space-y-4">
        <h3 class="text-sm font-semibold text-white/90">大模型服务与配额管理</h3>
        <p class="text-xs text-white/50 leading-relaxed">
          Memex 采用本地轻量桌面架构，支持对接 DeepSeek、OpenAI、Claude、GLM 等主流 API 服务商。你的 Token 消耗完全由你的专属 API Key 直接与服务商结算，Memex 本地仅负责结构化追踪。
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div class="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div class="text-xs text-white/60 font-medium">当前主模型端点</div>
            <div class="text-sm font-bold text-indigo-300 font-mono">DeepSeek V3 / V4 Official API</div>
            <p class="text-[11px] text-white/40">https://api.deepseek.com/v1</p>
          </div>
          <div class="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div class="text-xs text-white/60 font-medium">计费与计价估算</div>
            <div class="text-sm font-bold text-emerald-300 font-mono">输入 ¥1.0 / 1M · 输出 ¥2.0 / 1M</div>
            <p class="text-[11px] text-white/40">超高性价比，单次技能提炼平均仅需 300~500 Tokens</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
