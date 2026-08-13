<script setup lang="ts">
import { computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Copy, Link, Rocket, Star, FolderOpen, FileEdit, Terminal } from 'lucide-vue-next'
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
    is_favorite: boolean
  },
  searchQuery?: string,
  viewMode?: 'grid' | 'list'
}>()

const emit = defineEmits(['open-detail', 'favorite-toggled'])

const sourceColor = computed(() => {
  const source = props.skill.source_tool.toLowerCase()
  if (source.includes('zcode')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  if (source.includes('claude')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  if (source.includes('hermes')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  if (source.includes('codebuddy')) return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  if (source.includes('agents')) return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
})

const highlightText = (text: string) => {
  if (!props.searchQuery?.trim()) return text
  const q = props.searchQuery.trim()
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>')
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
  <div 
    class="group relative flex overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.06] transition-all duration-300 shadow-lg hover:shadow-indigo-500/20"
    :class="viewMode === 'list' ? 'flex-row items-stretch' : 'flex-col h-72'"
  >
    
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-white/5 backdrop-blur-md shrink-0"
         :class="viewMode === 'list' ? 'flex-col justify-center items-start w-48 border-r' : 'border-b'">
      <div class="flex items-center gap-3">
        <div 
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
          :class="sourceColor"
        >
        <component :is="Terminal" :size="20" />
        </div>
        <div class="min-w-0" :class="viewMode === 'list' ? 'w-full' : ''">
          <h3 class="font-medium text-white/90 truncate tracking-wide text-[15px]" :title="skill.name">
            {{ skill.name }}
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0" :class="viewMode === 'list' ? 'mt-4 w-full justify-between' : ''">
        <button 
          @click="toggleFavorite"
          class="p-1 rounded-md transition-all duration-200"
          :class="skill.is_favorite ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400/60'"
          :title="skill.is_favorite ? '取消收藏' : '收藏'"
        >
          <Star :size="16" :class="{ 'fill-current': skill.is_favorite }" />
        </button>
        <span 
          v-if="viewMode !== 'list'"
          class="px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase border backdrop-blur-sm"
          :class="sourceColor"
        >
          {{ skill.source_tool }}
        </span>
      </div>
    </div>

    <!-- Body (clickable to open drawer) -->
    <div class="flex-1 cursor-pointer flex flex-col justify-center min-w-0" :class="viewMode === 'list' ? 'p-3 gap-1' : 'p-5 space-y-4'" @click="emit('open-detail', skill)">
      
      <!-- Tags -->
      <div v-if="skill.tags" class="flex flex-wrap gap-2" :class="viewMode === 'list' ? 'order-2 mt-2' : ''">
        <span v-for="tag in skill.tags.split(',')" :key="tag" class="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          #{{ tag.trim() }}
        </span>
      </div>

      <div v-if="viewMode !== 'list'" class="bg-black/20 rounded-xl p-4 border border-white/5 shadow-inner">
        <pre class="text-sm font-mono text-white/70 line-clamp-4 whitespace-pre-wrap leading-relaxed" v-html="highlightText(skill.content.substring(0, 300))"></pre>
      </div>
      
      <div v-if="skill.local_path && viewMode !== 'list'" class="text-[11px] text-white/40 font-mono truncate px-1" :title="skill.local_path">
        {{ skill.local_path }}
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-5 bg-black/20 border-white/5 backdrop-blur-md shrink-0"
         :class="viewMode === 'list' ? 'flex-col justify-center border-l py-4 w-16' : 'border-t py-3'">
      <div class="flex items-center gap-1.5" :class="viewMode === 'list' ? 'flex-col mb-2' : ''">
        <button 
          @click="copyContent"
          class="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all border border-transparent hover:border-white/10"
          title="复制内容"
        >
          <Copy :size="16" />
        </button>
        <button 
          v-if="skill.local_path"
          @click="openInFinder"
          class="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all border border-transparent hover:border-white/10"
          title="在 Finder 中打开"
        >
          <FolderOpen :size="16" />
        </button>
        <button 
          v-if="skill.local_path"
          @click="openInEditor"
          class="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all border border-transparent hover:border-white/10"
          title="在 VS Code 中打开"
        >
          <FileEdit :size="16" />
        </button>
        <button 
          v-if="skill.local_path && viewMode !== 'list'"
          @click="copyPath"
          class="p-2 bg-white/5 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all border border-transparent hover:border-indigo-500/30"
          title="复制路径"
        >
          <Link :size="16" />
        </button>
        <button 
          v-if="viewMode !== 'list'"
          @click="copyWithPrefix"
          class="p-2 bg-white/5 hover:bg-white/10 text-purple-400 hover:text-purple-300 rounded-lg transition-all border border-transparent hover:border-purple-500/30"
          title="复制（含前缀模板）"
        >
          <Rocket :size="16" />
        </button>
      </div>
      
      <div v-if="viewMode !== 'list'" class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
        <component :is="Terminal" :size="14" class="text-white/40" />
      </div>
    </div>
  </div>
</template>
