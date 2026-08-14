<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import { 
  CheckSquare, 
  Pin, 
  Star, 
  Trash2
} from 'lucide-vue-next'

const props = defineProps<{
  memos: any[]
}>()

const emit = defineEmits(['edit', 'delete', 'toggle-pin', 'toggle-favorite', 'select-tag'])

const groupedTimeline = computed(() => {
  const groups: Record<string, any[]> = {}
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`

  props.memos.forEach(memo => {
    const createdDate = memo.created_at ? memo.created_at.split(' ')[0] : '其他'
    let groupTitle = createdDate

    if (createdDate === todayStr) {
      groupTitle = '📌 今天 (Today)'
    } else if (createdDate === yestStr) {
      groupTitle = '⏳ 昨天 (Yesterday)'
    } else {
      groupTitle = `📅 ${createdDate}`
    }

    if (!groups[groupTitle]) {
      groups[groupTitle] = []
    }
    groups[groupTitle].push(memo)
  })

  return groups
})

const renderMarkdown = (text: string) => {
  try {
    return marked.parse(text || '')
  } catch {
    return text
  }
}

const getTags = (tagsStr?: string) => {
  if (!tagsStr) return []
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
}
</script>

<template>
  <div class="space-y-8 max-w-4xl mx-auto pb-12">
    <div v-for="(groupMemos, dateGroup) in groupedTimeline" :key="dateGroup" class="space-y-4">
      <!-- Date Header Node -->
      <div class="sticky top-0 z-20 flex items-center gap-3 py-2 bg-[#0c0d12]/90 backdrop-blur-md">
        <div class="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] shrink-0"></div>
        <h3 class="text-sm font-bold text-white/90 font-mono tracking-wide">
          {{ dateGroup }}
        </h3>
        <span class="text-xs text-white/40 font-mono">({{ groupMemos.length }} 条记录)</span>
        <div class="flex-1 h-px bg-white/10"></div>
      </div>

      <!-- Timeline Items Stream -->
      <div class="pl-6 space-y-4 border-l border-white/10 ml-1.5">
        <div 
          v-for="memo in groupMemos" 
          :key="memo.id"
          @click="emit('edit', memo)"
          class="group relative rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-indigo-500/40 p-5 transition-all duration-200 cursor-pointer shadow-sm"
        >
          <!-- Top Row -->
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                {{ memo.folder }}
              </span>
              <span class="text-[11px] font-mono text-white/40">
                {{ memo.created_at?.split(' ')[1] || memo.created_at }}
              </span>
              <span v-if="memo.is_pinned" class="p-0.5 rounded text-amber-400">
                <Pin :size="11" class="fill-amber-400" />
              </span>
            </div>

            <!-- Quick Actions -->
            <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity" @click.stop>
              <button 
                @click="emit('toggle-pin', memo.id, !memo.is_pinned)"
                class="p-1 rounded hover:bg-white/10 text-white/40 hover:text-amber-400"
              >
                <Pin :size="12" :class="{ 'fill-amber-400 text-amber-400': memo.is_pinned }" />
              </button>
              <button 
                @click="emit('toggle-favorite', memo.id, !memo.is_favorite)"
                class="p-1 rounded hover:bg-white/10 text-white/40 hover:text-amber-400"
              >
                <Star :size="12" :class="{ 'fill-amber-400 text-amber-400': memo.is_favorite }" />
              </button>
              <button 
                @click="emit('delete', memo.id)"
                class="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-300"
              >
                <Trash2 :size="12" />
              </button>
            </div>
          </div>

          <!-- Title -->
          <h4 class="text-base font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
            {{ memo.title }}
          </h4>

          <!-- Todo checklist info -->
          <div v-if="memo.todo_total > 0" class="mb-3 flex items-center gap-3 text-xs font-mono">
            <div class="flex items-center gap-1 text-emerald-300">
              <CheckSquare :size="13" />
              <span>进度: {{ memo.todo_completed }}/{{ memo.todo_total }}</span>
            </div>
            <div class="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div 
                class="h-full bg-emerald-400 rounded-full"
                :style="{ width: `${(memo.todo_completed / memo.todo_total) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Content Body -->
          <div 
            class="prose prose-invert prose-xs text-white/70 max-w-none text-xs leading-relaxed"
            v-html="renderMarkdown(memo.content)"
          ></div>

          <!-- Tags -->
          <div v-if="getTags(memo.tags).length" class="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-white/5">
            <button 
              v-for="t in getTags(memo.tags)" 
              :key="t"
              @click.stop="emit('select-tag', t)"
              class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
            >
              #{{ t }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!memos.length" class="text-center py-16 text-white/40 text-sm">
      暂无备忘与日志记录，点击右上角新建第一篇吧！
    </div>
  </div>
</template>
