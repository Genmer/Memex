<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import { 
  Pin, 
  Star, 
  Trash2, 
  Edit3, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Clock, 
  Code2, 
  Sparkles,
  Layers,
  Brain
} from 'lucide-vue-next'

const props = defineProps<{
  memo: any
}>()

const emit = defineEmits(['edit', 'delete', 'toggle-pin', 'toggle-favorite', 'select-tag'])

const tagsList = computed(() => {
  if (!props.memo.tags) return []
  return props.memo.tags
    .split(',')
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0)
})

const renderedPreview = computed(() => {
  if (!props.memo.content) return ''
  // Strip code blocks or limit preview text for clean card display
  const truncated = props.memo.content.slice(0, 300)
  try {
    return marked.parse(truncated)
  } catch {
    return truncated
  }
})

const colorStyles = computed(() => {
  switch (props.memo.color) {
    case 'indigo':
      return {
        card: 'border-indigo-500/30 bg-indigo-950/15 hover:border-indigo-500/50',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        accent: 'text-indigo-400'
      }
    case 'emerald':
      return {
        card: 'border-emerald-500/30 bg-emerald-950/15 hover:border-emerald-500/50',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        accent: 'text-emerald-400'
      }
    case 'amber':
      return {
        card: 'border-amber-500/30 bg-amber-950/15 hover:border-amber-500/50',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        accent: 'text-amber-400'
      }
    case 'rose':
      return {
        card: 'border-rose-500/30 bg-rose-950/15 hover:border-rose-500/50',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        accent: 'text-rose-400'
      }
    case 'cyan':
      return {
        card: 'border-cyan-500/30 bg-cyan-950/15 hover:border-cyan-500/50',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        accent: 'text-cyan-400'
      }
    case 'purple':
      return {
        card: 'border-purple-500/30 bg-purple-950/15 hover:border-purple-500/50',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        accent: 'text-purple-400'
      }
    default:
      return {
        card: 'border-white/10 bg-white/[0.03] hover:border-white/20',
        badge: 'bg-white/10 text-white/70 border-white/10',
        accent: 'text-white/60'
      }
  }
})

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'memory': return Brain
    case 'journal': return Calendar
    case 'todo': return CheckSquare
    case 'fleeting': return Sparkles
    case 'code': return Code2
    default: return FileText
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'memory': return '专属记忆'
    case 'journal': return '工作日志'
    case 'todo': return '待办任务'
    case 'fleeting': return '闪念灵感'
    case 'code': return '代码片段'
    default: return '自由备忘'
  }
}
</script>

<template>
  <div 
    @click="emit('edit', memo)"
    class="group relative rounded-2xl border p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5"
    :class="colorStyles.card"
  >
    <!-- Top Meta Row -->
    <div>
      <div class="flex items-start justify-between gap-2 mb-3">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <!-- Folder Pill -->
          <span class="px-2 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1 shrink-0" :class="colorStyles.badge">
            <Layers :size="11" />
            <span>{{ memo.folder || '默认' }}</span>
          </span>

          <!-- Type Badge -->
          <span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 border border-white/10 text-white/60 flex items-center gap-1 shrink-0">
            <component :is="getTypeIcon(memo.note_type)" :size="11" />
            <span>{{ getTypeLabel(memo.note_type) }}</span>
          </span>

          <!-- Pinned Indicator -->
          <span v-if="memo.is_pinned" class="p-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="已置顶">
            <Pin :size="11" class="fill-amber-400" />
          </span>
        </div>

        <!-- Hover Action Buttons -->
        <div class="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" @click.stop>
          <button 
            @click="emit('toggle-pin', memo.id, !memo.is_pinned)"
            class="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-amber-400 transition-colors"
            :title="memo.is_pinned ? '取消置顶' : '置顶备忘'"
          >
            <Pin :size="13" :class="{ 'fill-amber-400 text-amber-400': memo.is_pinned }" />
          </button>
          <button 
            @click="emit('toggle-favorite', memo.id, !memo.is_favorite)"
            class="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-amber-400 transition-colors"
            :title="memo.is_favorite ? '取消收藏' : '收藏备忘'"
          >
            <Star :size="13" :class="{ 'fill-amber-400 text-amber-400': memo.is_favorite }" />
          </button>
          <button 
            @click="emit('delete', memo.id)"
            class="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-colors"
            title="删除备忘"
          >
            <Trash2 :size="13" />
          </button>
        </div>
      </div>

      <!-- Title -->
      <h3 class="text-base font-bold text-white/95 group-hover:text-white transition-colors mb-2 leading-snug line-clamp-2">
        {{ memo.title || '无标题备忘' }}
      </h3>

      <!-- Todo Checklist Progress Bar (if todo items exist) -->
      <div v-if="memo.todo_total > 0" class="mb-3 p-2 rounded-xl bg-black/20 border border-white/5 space-y-1.5">
        <div class="flex items-center justify-between text-[11px] font-mono">
          <span class="text-white/60 flex items-center gap-1">
            <CheckSquare :size="12" class="text-emerald-400" />
            <span>待办进度</span>
          </span>
          <span class="font-bold" :class="memo.todo_completed === memo.todo_total ? 'text-emerald-400' : 'text-amber-400'">
            {{ memo.todo_completed }} / {{ memo.todo_total }} ({{ Math.round((memo.todo_completed / memo.todo_total) * 100) }}%)
          </span>
        </div>
        <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div 
            class="h-full rounded-full transition-all duration-300"
            :class="memo.todo_completed === memo.todo_total ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'"
            :style="{ width: `${(memo.todo_completed / memo.todo_total) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Markdown Preview Snippet -->
      <div 
        class="prose prose-invert prose-xs text-white/70 line-clamp-4 leading-relaxed font-sans overflow-hidden text-xs"
        v-html="renderedPreview"
      ></div>
    </div>

    <!-- Bottom Metadata & Tags -->
    <div class="pt-4 mt-3 border-t border-white/5 space-y-2">
      <!-- Tags List -->
      <div v-if="tagsList.length" class="flex flex-wrap gap-1">
        <button 
          v-for="t in tagsList" 
          :key="t"
          @click.stop="emit('select-tag', t)"
          class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 transition-colors"
        >
          #{{ t }}
        </button>
      </div>

      <!-- Timestamp -->
      <div class="flex items-center justify-between text-[10px] text-white/40 font-mono">
        <span class="flex items-center gap-1">
          <Clock :size="10" />
          <span>{{ memo.updated_at || memo.created_at }}</span>
        </span>
        <span class="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity flex items-center gap-1 font-sans">
          <Edit3 :size="10" />
          <span>编辑</span>
        </span>
      </div>
    </div>
  </div>
</template>
