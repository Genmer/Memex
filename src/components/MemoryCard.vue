<script setup lang="ts">
import { computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Copy, BookOpen, Star } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  memory: any,
  searchQuery?: string,
  viewMode?: 'grid' | 'list',
  isSelectMode?: boolean,
  isSelected?: boolean
}>()

const emit = defineEmits(['open-detail', 'favorite-toggled', 'select-tag', 'toggle-select'])

const sourceColor = computed(() => {
  if (props.memory.source_tool === 'zcode') return 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
  if (props.memory.source_tool === 'claude') return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30'
  if (props.memory.source_tool === 'trae') return 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30'
  return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
})

const parsedTags = computed(() => {
  if (!props.memory.tags) return []
  return props.memory.tags
    .split(',')
    .map((t: string) => t.trim().replace(/^["']|["']$/g, ''))
    .filter((t: string) => t && t !== '>' && t !== '|' && t !== '-' && t.length <= 30)
})

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.memory.content)
    toast.success('内容已复制到剪贴板')
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

const toggleFavorite = async () => {
  try {
    const newVal: boolean = await invoke('toggle_memory_favorite', { memoryId: props.memory.id })
    emit('favorite-toggled', props.memory.id, newVal)
    toast.success(newVal ? '已收藏' : '已取消收藏')
  } catch (err) {
    toast.error('收藏操作失败')
  }
}
</script>

<template>
  <!-- ================= LIST ROW VIEW ================= -->
  <div 
    v-if="viewMode === 'list'"
    class="perf-contain-row group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/5 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-colors duration-150 cursor-pointer shadow-sm hover:shadow-indigo-500/5 select-none"
    @click="isSelectMode ? emit('toggle-select', memory.id) : emit('open-detail', memory)"
  >
    <!-- Selection Checkbox -->
    <div 
      v-if="isSelectMode" 
      @click.stop="emit('toggle-select', memory.id)"
      class="shrink-0 p-0.5"
    >
      <div 
        class="w-4 h-4 rounded flex items-center justify-center transition-all"
        :class="isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-white/30 hover:border-slate-500 dark:hover:border-white/60'"
      >
        <svg v-if="isSelected" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
    </div>

    <!-- Favorite Star -->
    <button 
      @click.stop="toggleFavorite"
      class="shrink-0 p-1 rounded-md transition-colors"
      :class="memory.is_favorite ? 'text-amber-500 dark:text-yellow-400' : 'text-slate-300 dark:text-white/20 hover:text-amber-500 dark:hover:text-yellow-400/60'"
      :title="memory.is_favorite ? '取消收藏' : '收藏'"
    >
      <Star :size="15" :class="{ 'fill-current': memory.is_favorite }" />
    </button>

    <!-- Source Tool Pill -->
    <span 
      class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase border font-mono"
      :class="sourceColor"
    >
      {{ memory.source_tool }}
    </span>

    <!-- Memory Name / Title -->
    <div class="w-60 xl:w-72 shrink-0 min-w-0 flex items-center gap-2">
      <BookOpen :size="14" class="text-slate-400 dark:text-white/40 shrink-0" />
      <h3 class="font-medium text-slate-800 dark:text-white/90 text-sm truncate" :title="memory.name">
        {{ memory.name }}
      </h3>
    </div>

    <!-- Tags Row -->
    <div class="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
      <template v-if="parsedTags.length">
        <button 
          v-for="tag in parsedTags.slice(0, 4)" 
          :key="tag" 
          @click.stop="emit('select-tag', tag)"
          class="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-slate-200/50 dark:border-white/5 transition-colors"
          title="按此标签筛选"
        >
          #{{ tag }}
        </button>
        <span v-if="parsedTags.length > 4" class="text-[10px] text-slate-400 dark:text-white/30 font-mono shrink-0">
          +{{ parsedTags.length - 4 }}
        </span>
      </template>
    </div>

    <!-- Date -->
    <div class="shrink-0 text-[11px] text-slate-400 dark:text-white/30 font-mono">
      {{ new Date(memory.extracted_at).toLocaleDateString() }}
    </div>

    <!-- Quick Hover Actions -->
    <div class="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        @click.stop="copyContent"
        class="p-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
        title="复制内容"
      >
        <Copy :size="14" />
      </button>
    </div>
  </div>

  <!-- ================= GRID CARD VIEW ================= -->
  <div 
    v-else
    class="perf-contain-card group relative flex flex-col h-72 overflow-hidden rounded-2xl bg-white/90 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-white/[0.06] transition-colors duration-150 shadow-sm hover:shadow-md dark:hover:shadow-indigo-500/10"
  >
    <!-- Selection checkbox overlay in batch mode -->
    <div 
      v-if="isSelectMode" 
      @click.stop="emit('toggle-select', memory.id)"
      class="absolute top-3 left-3 z-20 cursor-pointer p-1 rounded-lg bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/20 hover:border-indigo-500 transition-all"
    >
      <div 
        class="w-4 h-4 rounded flex items-center justify-center transition-all"
        :class="isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-white/40'"
      >
        <svg v-if="isSelected" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5 shrink-0"
         :class="isSelectMode ? 'pl-11' : ''">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <BookOpen :size="18" class="text-slate-400 dark:text-white/40 shrink-0" />
        <div class="min-w-0 flex-1">
          <h3 class="font-medium text-slate-900 dark:text-white/90 truncate tracking-wide text-[15px]" :title="memory.name">
            {{ memory.name }}
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button 
          @click="toggleFavorite"
          class="p-1 rounded-md transition-colors"
          :class="memory.is_favorite ? 'text-amber-500 dark:text-yellow-400' : 'text-slate-300 dark:text-white/20 hover:text-amber-500 dark:hover:text-yellow-400/60'"
          :title="memory.is_favorite ? '取消收藏' : '收藏'"
        >
          <Star :size="16" :class="{ 'fill-current': memory.is_favorite }" />
        </button>
        <span 
          class="px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase border"
          :class="sourceColor"
        >
          {{ memory.source_tool }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div 
      class="flex-1 cursor-pointer flex flex-col justify-center min-w-0 p-5 space-y-4" 
      @click="isSelectMode ? emit('toggle-select', memory.id) : emit('open-detail', memory)"
    >
      <!-- Tags -->
      <div v-if="parsedTags.length" class="flex flex-wrap gap-2">
        <button 
          v-for="tag in parsedTags" 
          :key="tag" 
          @click.stop="emit('select-tag', tag)"
          class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/5 transition-colors"
          title="按此标签筛选"
        >
          #{{ tag }}
        </button>
      </div>

      <!-- Content Preview -->
      <div class="bg-slate-50 dark:bg-black/20 rounded-xl p-4 border border-slate-200/60 dark:border-white/5 shadow-inner">
        <pre class="text-sm font-mono text-slate-700 dark:text-white/70 line-clamp-6 whitespace-pre-wrap leading-relaxed">{{ memory.content }}</pre>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 bg-slate-50/60 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 shrink-0 py-3">
      <div class="text-[10px] text-slate-400 dark:text-white/40 tracking-wider font-mono">
        {{ new Date(memory.extracted_at).toLocaleString() }}
      </div>
      <button 
        @click="copyContent"
        class="p-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors border border-slate-200/50 dark:border-transparent"
        title="复制内容"
      >
        <Copy :size="16" />
      </button>
    </div>
  </div>
</template>
