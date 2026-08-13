<script setup lang="ts">
import { computed } from 'vue'
import { Copy, BookOpen } from 'lucide-vue-next'

const props = defineProps<{
  memory: any,
  viewMode?: 'grid' | 'list'
}>()

const sourceColor = computed(() => {
  if (props.memory.source_tool === 'zcode') return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
  if (props.memory.source_tool === 'claude') return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
})

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.memory.content)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}
</script>

<template>
  <div 
    class="group relative flex overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.06] transition-all duration-300 shadow-lg hover:shadow-indigo-500/20"
    :class="viewMode === 'list' ? 'flex-row items-stretch' : 'flex-col h-72'"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-white/5 backdrop-blur-md shrink-0"
         :class="viewMode === 'list' ? 'flex-col justify-center items-start w-48 border-r' : 'border-b'">
      <div class="flex items-center gap-3 w-full">
        <BookOpen :size="18" class="text-white/40 shrink-0" />
        <div class="min-w-0 flex-1">
          <h3 class="font-medium text-white/90 truncate tracking-wide text-[15px]" :title="memory.name">
            {{ memory.name }}
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0" :class="viewMode === 'list' ? 'mt-4 w-full justify-start' : ''">
        <span 
          class="px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase border backdrop-blur-sm"
          :class="sourceColor"
        >
          {{ memory.source_tool }}
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 cursor-pointer flex flex-col justify-center min-w-0" :class="viewMode === 'list' ? 'p-3 gap-1' : 'p-5 space-y-4'">
      
      <!-- Tags -->
      <div v-if="memory.tags" class="flex flex-wrap gap-2" :class="viewMode === 'list' ? 'order-2 mt-2' : ''">
        <span v-for="tag in memory.tags.split(',')" :key="tag" class="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/70 border border-white/5">
          {{ tag.trim() }}
        </span>
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
