<script setup lang="ts">
import { computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { X, Copy, FolderOpen, FileEdit, Star, ExternalLink } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  skill: any
}>()

const emit = defineEmits(['close', 'favorite-toggled'])

const sourceColor = computed(() => {
  const source = (props.skill?.source_tool || '').toLowerCase()
  if (source.includes('zcode')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  if (source.includes('claude')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  if (source.includes('hermes')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  if (source.includes('codebuddy')) return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
})

const copyContent = async () => {
  if (props.skill) {
    await navigator.clipboard.writeText(props.skill.content)
    toast.success('内容已复制到剪贴板')
  }
}

const toggleFavorite = async () => {
  if (!props.skill) return
  try {
    const newVal: boolean = await invoke('toggle_favorite', { skillId: props.skill.id })
    emit('favorite-toggled', props.skill.id, newVal)
    toast.success(newVal ? '已收藏' : '已取消收藏')
  } catch (err) {
    toast.error('操作失败')
  }
}

const openInFinder = async () => {
  if (props.skill?.local_path) {
    await invoke('open_in_finder', { path: props.skill.local_path })
  }
}

const openInEditor = async () => {
  if (props.skill?.local_path) {
    await invoke('open_in_editor', { path: props.skill.local_path })
  }
}
</script>

<template>
  <!-- Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="skill" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      @click="emit('close')"
    />
  </Transition>

  <!-- Drawer -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="translate-x-full"
    leave-to-class="translate-x-full"
  >
    <div 
      v-if="skill"
      class="fixed top-0 right-0 z-50 w-[560px] max-w-[85vw] h-screen flex flex-col bg-[#0f1117]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.8)]"
      @keydown.escape="emit('close')"
      tabindex="0"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <button 
            @click="toggleFavorite"
            class="p-1.5 rounded-lg transition-all shrink-0"
            :class="skill.is_favorite ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/30 hover:text-yellow-400/60 hover:bg-white/5'"
          >
            <Star :size="18" :class="{ 'fill-current': skill.is_favorite }" />
          </button>
          <h2 class="text-xl font-semibold text-white truncate">{{ skill.name }}</h2>
        </div>
        <button 
          @click="emit('close')"
          class="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all shrink-0"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Meta bar -->
      <div class="px-6 py-3 flex items-center gap-3 border-b border-white/5 shrink-0 flex-wrap">
        <span 
          class="px-3 py-1 rounded-lg text-xs font-semibold tracking-wider uppercase border backdrop-blur-sm"
          :class="sourceColor"
        >
          {{ skill.source_tool }}
        </span>
        <div v-if="skill.tags" class="flex flex-wrap gap-1.5">
          <span 
            v-for="tag in skill.tags.split(',')" 
            :key="tag" 
            class="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
          >
            #{{ tag.trim() }}
          </span>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="bg-black/30 rounded-xl p-6 border border-white/5 shadow-inner">
          <pre class="text-sm font-mono text-white/80 whitespace-pre-wrap leading-relaxed break-words">{{ skill.content }}</pre>
        </div>

        <!-- File path -->
        <div v-if="skill.local_path" class="mt-4 px-1">
          <p class="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">文件路径</p>
          <div class="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 border border-white/5">
            <code class="text-xs text-white/50 font-mono truncate flex-1">{{ skill.local_path }}</code>
            <button 
              @click="openInFinder"
              class="p-1.5 text-white/40 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all shrink-0"
              title="在 Finder 中显示"
            >
              <FolderOpen :size="14" />
            </button>
            <button 
              @click="openInEditor"
              class="p-1.5 text-white/40 hover:text-green-400 hover:bg-green-500/10 rounded transition-all shrink-0"
              title="用编辑器打开"
            >
              <FileEdit :size="14" />
            </button>
          </div>
        </div>

        <!-- Timestamps -->
        <div v-if="skill.created_at" class="mt-4 grid grid-cols-2 gap-4 text-xs text-white/30 px-1">
          <div>
            <p class="uppercase tracking-widest text-[10px] mb-1">创建于</p>
            <p class="font-mono">{{ new Date(skill.created_at).toLocaleString() }}</p>
          </div>
          <div>
            <p class="uppercase tracking-widest text-[10px] mb-1">更新于</p>
            <p class="font-mono">{{ new Date(skill.updated_at).toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <!-- Bottom Action Bar -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0 bg-black/20">
        <button
          v-if="skill.local_path"
          @click="openInEditor"
          class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all"
        >
          <ExternalLink :size="14" />
          打开文件
        </button>
        <button
          @click="copyContent"
          class="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
        >
          <Copy :size="14" />
          复制全文
        </button>
      </div>
    </div>
  </Transition>
</template>
