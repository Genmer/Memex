<script setup lang="ts">
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Copy, Link, Rocket, Star, FolderOpen, FileEdit, Terminal, Sparkles, Loader2 } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  skill: {
    id: number
    name: string
    content: string
    source_tool: string
    local_path?: string
    prefix_template?: string
    tags?: string
    summary_zh?: string
    category_zh?: string
    tags_zh?: string
    is_favorite: boolean
  },
  searchQuery?: string,
  viewMode?: 'grid' | 'list',
  isSelectMode?: boolean,
  isSelected?: boolean
}>()

const emit = defineEmits(['open-detail', 'favorite-toggled', 'select-tag', 'toggle-select', 'ai-analyzed'])

const isAnalyzing = ref(false)

const sourceColor = computed(() => {
  const source = props.skill.source_tool.toLowerCase()
  if (source.includes('zcode')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  if (source.includes('claude')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
  if (source.includes('hermes')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  if (source.includes('codebuddy')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
  if (source.includes('agents')) return 'bg-teal-500/15 text-teal-400 border-teal-500/30'
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
})

const parsedTags = computed(() => {
  if (!props.skill.tags) return []
  return props.skill.tags
    .split(',')
    .map(t => t.trim().replace(/^["']|["']$/g, ''))
    .filter(t => t && t !== '>' && t !== '|' && t !== '-' && t.length <= 30)
})

const highlightText = (text: string) => {
  if (!props.searchQuery?.trim()) return text
  const q = props.searchQuery.trim()
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-500/40 text-yellow-200 rounded px-0.5">$1</mark>')
}

const analyzeAi = async () => {
  if (isAnalyzing.value) return
  isAnalyzing.value = true
  try {
    const res: any = await invoke('analyze_skill_ai', { skillId: props.skill.id })
    props.skill.summary_zh = res.summary_zh
    props.skill.category_zh = res.category_zh
    props.skill.tags_zh = res.tags_zh.join(', ')
    props.skill.tags = res.merged_tags
    emit('ai-analyzed', res)
    toast.success(`已提炼用途: ${res.summary_zh}`)
  } catch (err: any) {
    toast.error(typeof err === 'string' ? err : `AI 解析失败: ${JSON.stringify(err)}`)
  } finally {
    isAnalyzing.value = false
  }
}

const copyContent = async () => {
  await navigator.clipboard.writeText(props.skill.content)
  toast.success('内容已复制到剪贴板')
}

const copyPath = async () => {
  if (props.skill.local_path) {
    await navigator.clipboard.writeText(props.skill.local_path)
    toast.success('路径已复制')
  }
}

const copyWithPrefix = async () => {
  const text = `${props.skill.prefix_template || ''}\n\n${props.skill.content}`
  await navigator.clipboard.writeText(text)
  toast.success('已复制（含前缀模板）')
}

const toggleFavorite = async () => {
  try {
    const newVal: boolean = await invoke('toggle_favorite', { skillId: props.skill.id })
    emit('favorite-toggled', props.skill.id, newVal)
    toast.success(newVal ? '已收藏' : '已取消收藏')
  } catch (err) {
    toast.error('收藏操作失败')
  }
}

const openInFinder = async () => {
  if (props.skill.local_path) {
    try {
      await invoke('open_in_finder', { path: props.skill.local_path })
    } catch (err) {
      toast.error('无法打开 Finder')
    }
  }
}

const openInEditor = async () => {
  if (props.skill.local_path) {
    try {
      await invoke('open_in_editor', { path: props.skill.local_path })
    } catch (err) {
      toast.error('无法打开编辑器')
    }
  }
}
</script>

<template>
  <!-- ================= LIST ROW VIEW ================= -->
  <div 
    v-if="viewMode === 'list'"
    class="perf-contain-row group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/40 transition-colors duration-150 cursor-pointer shadow-sm select-none"
    @click="isSelectMode ? emit('toggle-select', skill.id) : emit('open-detail', skill)"
  >
    <!-- Selection Checkbox -->
    <div 
      v-if="isSelectMode" 
      @click.stop="emit('toggle-select', skill.id)"
      class="shrink-0 p-0.5"
    >
      <div 
        class="w-4 h-4 rounded flex items-center justify-center transition-all"
        :class="isSelected ? 'bg-indigo-600 text-white' : 'border border-white/30 hover:border-white/60'"
      >
        <svg v-if="isSelected" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
    </div>

    <!-- Favorite Star -->
    <button 
      @click.stop="toggleFavorite"
      class="shrink-0 p-1 rounded-md transition-colors"
      :class="skill.is_favorite ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/60'"
      :title="skill.is_favorite ? '取消收藏' : '收藏'"
    >
      <Star :size="15" :class="{ 'fill-current': skill.is_favorite }" />
    </button>

    <!-- Source Tool Pill -->
    <span 
      class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase border font-mono"
      :class="sourceColor"
    >
      {{ skill.source_tool }}
    </span>

    <!-- Skill Name / Title -->
    <div class="w-52 xl:w-60 shrink-0 min-w-0">
      <h3 class="font-medium text-white/90 text-sm truncate" :title="skill.name">
        <span v-html="highlightText(skill.name)"></span>
      </h3>
    </div>

    <!-- AI Summary / Category Insight Column -->
    <div class="w-64 xl:w-80 shrink-0 min-w-0 flex items-center gap-2">
      <div v-if="skill.summary_zh" class="flex items-center gap-1.5 min-w-0 flex-1" :title="`【${skill.category_zh || '用途'}】${skill.summary_zh}`">
        <span v-if="skill.category_zh" class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shrink-0">
          {{ skill.category_zh }}
        </span>
        <span class="text-xs text-white/70 truncate flex-1 font-sans">
          {{ skill.summary_zh }}
        </span>
      </div>
      <button 
        v-else 
        @click.stop="analyzeAi"
        :disabled="isAnalyzing"
        class="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all flex items-center gap-1 opacity-80 hover:opacity-100"
        title="点击由 AI 提炼通俗中文用途与分类"
      >
        <Loader2 v-if="isAnalyzing" :size="11" class="animate-spin" />
        <Sparkles v-else :size="11" />
        <span>{{ isAnalyzing ? '解析中...' : 'AI解读' }}</span>
      </button>
    </div>

    <!-- Tags Row -->
    <div class="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
      <template v-if="parsedTags.length">
        <button 
          v-for="tag in parsedTags.slice(0, 3)" 
          :key="tag" 
          @click.stop="emit('select-tag', tag)"
          class="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300/80 hover:text-indigo-200 border border-indigo-500/20 transition-colors"
          title="按此标签筛选"
        >
          #{{ tag }}
        </button>
        <span v-if="parsedTags.length > 3" class="text-[10px] text-white/30 font-mono shrink-0">
          +{{ parsedTags.length - 3 }}
        </span>
      </template>
    </div>

    <!-- Quick Hover Actions -->
    <div class="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        v-if="!skill.summary_zh"
        @click.stop="analyzeAi"
        :disabled="isAnalyzing"
        class="p-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-lg transition-colors border border-indigo-500/30"
        title="AI 智能解析用途"
      >
        <Loader2 v-if="isAnalyzing" :size="14" class="animate-spin" />
        <Sparkles v-else :size="14" />
      </button>
      <button 
        @click.stop="copyContent"
        class="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
        title="复制内容"
      >
        <Copy :size="14" />
      </button>
      <button 
        v-if="skill.local_path"
        @click.stop="openInFinder"
        class="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
        title="在 Finder 中打开"
      >
        <FolderOpen :size="14" />
      </button>
      <button 
        v-if="skill.local_path"
        @click.stop="openInEditor"
        class="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
        title="在 VS Code 中打开"
      >
        <FileEdit :size="14" />
      </button>
    </div>
  </div>

  <!-- ================= GRID CARD VIEW ================= -->
  <div 
    v-else
    class="perf-contain-card group relative flex flex-col h-80 overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.06] transition-colors duration-150 shadow-lg hover:shadow-indigo-500/10"
  >
    <!-- Selection checkbox overlay in batch mode -->
    <div 
      v-if="isSelectMode" 
      @click.stop="emit('toggle-select', skill.id)"
      class="absolute top-3 left-3 z-20 cursor-pointer p-1 rounded-lg bg-black/40 border border-white/20 hover:border-indigo-500 transition-all"
    >
      <div 
        class="w-4 h-4 rounded flex items-center justify-center transition-all"
        :class="isSelected ? 'bg-indigo-600 text-white' : 'border border-white/40'"
      >
        <svg v-if="isSelected" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0"
         :class="isSelectMode ? 'pl-11' : ''">
      <div class="flex items-center gap-3 min-w-0 flex-1 mr-2">
        <div 
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner border"
          :class="sourceColor"
        >
          <component :is="Terminal" :size="18" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="font-medium text-white/90 truncate tracking-wide text-[15px]" :title="skill.name">
            <span v-html="highlightText(skill.name)"></span>
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button 
          @click="toggleFavorite"
          class="p-1 rounded-md transition-colors"
          :class="skill.is_favorite ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/60'"
          :title="skill.is_favorite ? '取消收藏' : '收藏'"
        >
          <Star :size="16" :class="{ 'fill-current': skill.is_favorite }" />
        </button>
        <span 
          class="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase border"
          :class="sourceColor"
        >
          {{ skill.source_tool }}
        </span>
      </div>
    </div>

    <!-- Body (clickable to open drawer or toggle select in batch mode) -->
    <div 
      class="flex-1 cursor-pointer flex flex-col justify-between min-w-0 p-4 space-y-2.5 overflow-hidden" 
      @click="isSelectMode ? emit('toggle-select', skill.id) : emit('open-detail', skill)"
    >
      <!-- AI Insight Banner if available -->
      <div v-if="skill.summary_zh" class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs leading-relaxed flex items-start gap-2 shadow-inner" :title="skill.summary_zh">
        <Sparkles :size="13" class="text-indigo-400 shrink-0 mt-0.5" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span v-if="skill.category_zh" class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/25 text-indigo-200 font-medium">
              {{ skill.category_zh }}
            </span>
            <span class="text-[10px] text-indigo-300/60 font-mono">用途释义</span>
          </div>
          <p class="text-xs text-indigo-200/90 line-clamp-2 leading-relaxed font-sans">
            {{ skill.summary_zh }}
          </p>
        </div>
      </div>

      <!-- Quick AI Trigger if no summary -->
      <div v-else class="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-dashed border-white/10 hover:border-indigo-500/40 transition-colors">
        <span class="text-[11px] text-white/40">暂未提炼中文释义</span>
        <button 
          @click.stop="analyzeAi"
          :disabled="isAnalyzing"
          class="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/25 transition-all flex items-center gap-1"
        >
          <Loader2 v-if="isAnalyzing" :size="10" class="animate-spin" />
          <Sparkles v-else :size="10" />
          <span>{{ isAnalyzing ? '解析中...' : 'AI解析' }}</span>
        </button>
      </div>

      <!-- Content Preview Codeblock -->
      <div class="bg-black/20 rounded-xl p-3 border border-white/5 shadow-inner flex-1 min-h-0 overflow-hidden">
        <pre class="text-xs font-mono text-white/70 line-clamp-3 whitespace-pre-wrap leading-relaxed" v-html="highlightText(skill.content.substring(0, 250))"></pre>
      </div>

      <!-- Tags -->
      <div v-if="parsedTags.length" class="flex flex-wrap gap-1.5">
        <button 
          v-for="tag in parsedTags.slice(0, 4)" 
          :key="tag" 
          @click.stop="emit('select-tag', tag)"
          class="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors truncate max-w-[120px]"
          title="按此标签筛选"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-4 bg-black/20 border-t border-white/5 shrink-0 py-2.5">
      <div class="flex items-center gap-1.5">
        <button 
          @click="copyContent"
          class="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
          title="复制内容"
        >
          <Copy :size="14" />
        </button>
        <button 
          v-if="skill.local_path"
          @click="openInFinder"
          class="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
          title="在 Finder 中打开"
        >
          <FolderOpen :size="14" />
        </button>
        <button 
          v-if="skill.local_path"
          @click="openInEditor"
          class="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
          title="在 VS Code 中打开"
        >
          <FileEdit :size="14" />
        </button>
        <button 
          v-if="skill.local_path"
          @click="copyPath"
          class="p-1.5 bg-white/5 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors"
          title="复制路径"
        >
          <Link :size="14" />
        </button>
        <button 
          @click="copyWithPrefix"
          class="p-1.5 bg-white/5 hover:bg-white/10 text-purple-400 hover:text-purple-300 rounded-lg transition-colors"
          title="复制（含前缀模板）"
        >
          <Rocket :size="14" />
        </button>
      </div>
      
      <button 
        @click.stop="analyzeAi"
        :disabled="isAnalyzing"
        class="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] flex items-center gap-1 transition-all"
        title="AI 智能提炼中文释义与分类"
      >
        <Loader2 v-if="isAnalyzing" :size="11" class="animate-spin" />
        <Sparkles v-else :size="11" />
        <span>{{ skill.summary_zh ? '重新解析' : 'AI解析' }}</span>
      </button>
    </div>
  </div>
</template>
