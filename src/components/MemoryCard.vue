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
  if (props.memory.source_tool === 'zcode') return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
  if (props.memory.source_tool === 'claude') return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
  if (props.memory.source_tool === 'trae') return 'text-sky-400 bg-sky-500/10 border-sky-500/30'
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
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
  <div 
    class="group relative flex overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.06] transition-all duration-300 shadow-lg hover:shadow-indigo-500/20"
    :class="viewMode === 'list' ? 'flex-row items-stretch' : 'flex-col h-72'"
  >
    <!-- Selection checkbox overlay in batch mode -->
    <div 
      v-if="isSelectMode" 
      @click.stop="emit('toggle-select', memory.id)"
      class="absolute top-3 left-3 z-20 cursor-pointer p-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 hover:border-indigo-400 transition-all"
    >
      <div 
        class="w-4 h-4 rounded flex items-center justify-center transition-all"
        :class="isSelected ? 'bg-indigo-600 text-white' : 'border border-white/40'"
      >
        <svg v-if="isSelected" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-white/5 backdrop-blur-md shrink-0"
         :class="[
           viewMode === 'list' ? 'flex-col justify-center items-start w-48 border-r' : 'border-b',
           isSelectMode ? 'pl-11' : ''
         ]">
      <div class="flex items-center gap-3 w-full">
        <BookOpen :size="18" class="text-white/40 shrink-0" />
        <div class="min-w-0 flex-1">
          <h3 class="font-medium text-white/90 truncate tracking-wide text-[15px]" :title="memory.name">
            {{ memory.name }}
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0" :class="viewMode === 'list' ? 'mt-4 w-full justify-start' : ''">
        <button 
          @click="toggleFavorite"
          class="p-1 rounded-md transition-all duration-200"
          :class="memory.is_favorite ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/60'"
          :title="memory.is_favorite ? '取消收藏' : '收藏'"
        >
          <Star :size="16" :class="{ 'fill-current': memory.is_favorite }" />
        </button>
        <span 
          class="px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase border backdrop-blur-sm"
          :class="sourceColor"
        >
          {{ memory.source_tool }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div 
      class="flex-1 cursor-pointer flex flex-col justify-center min-w-0" 
      :class="viewMode === 'list' ? 'p-3 gap-1' : 'p-5 space-y-4'" 
      @click="isSelectMode ? emit('toggle-select', memory.id) : emit('open-detail', memory)"
    >
      
      <!-- Tags -->
      <div v-if="memory.tags" class="flex flex-wrap gap-2" :class="viewMode === 'list' ? 'order-2 mt-2' : ''">
        <button 
          v-for="tag in memory.tags.split(',')" 
          :key="tag" 
          @click.stop="emit('select-tag', tag.trim())"
          class="px-2 py-0.5 rounded text-xs font-medium bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/5 transition-colors"
          title="按此标签筛选"
        >
          #{{ tag.trim() }}
        </button>
      </div>

      <!-- Content Preview -->
      <div v-if="viewMode !== 'list'" class="bg-black/20 rounded-xl p-4 border border-white/5 shadow-inner">
        <pre class="text-sm font-mono text-white/70 line-clamp-6 whitespace-pre-wrap leading-relaxed">{{ memory.content }}</pre>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 bg-black/20 border-white/5 backdrop-blur-md shrink-0"
         :class="viewMode === 'list' ? 'flex-col justify-center border-l py-4 w-24' : 'border-t py-3'">
      <div class="text-[10px] text-white/40 tracking-wider font-mono text-center" :class="viewMode === 'list' ? 'mb-2' : ''">
        <div v-if="viewMode === 'list'">{{ new Date(memory.extracted_at).toLocaleDateString() }}</div>
        <div v-else>{{ new Date(memory.extracted_at).toLocaleString() }}</div>
      </div>
      <button 
        @click="copyContent"
        class="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all border border-transparent hover:border-white/10"
        title="Copy Content"
      >
        <Copy :size="16" />
      </button>
    </div>
  </div>
</template>
