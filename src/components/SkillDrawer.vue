<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { X, Copy, FolderOpen, FileEdit, Star, ExternalLink, Pencil, Trash2, Save, BookOpen, Terminal } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  skill: any
  type?: 'skill' | 'memory'
  isNew?: boolean
}>()

const emit = defineEmits(['close', 'favorite-toggled', 'saved', 'deleted'])

const isSkill = computed(() => props.type !== 'memory')
const asset = computed(() => props.skill || {})

const editing = ref(false)
const draftName = ref('')
const draftTags = ref('')
const draftContent = ref('')

watch(() => props.skill, () => {
  if (props.skill) {
    draftName.value = props.skill.name || ''
    draftTags.value = props.skill.tags || ''
    draftContent.value = props.skill.content || ''
    editing.value = !!props.isNew
  }
}, { immediate: true })

const sourceColor = computed(() => {
  const source = (asset.value.source_tool || '').toLowerCase()
  if (source.includes('zcode')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  if (source.includes('claude')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  if (source.includes('trae')) return 'bg-sky-500/20 text-sky-400 border-sky-500/30'
  if (source.includes('hermes')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
})

const typeIcon = computed(() => isSkill.value ? Terminal : BookOpen)
const typeLabel = computed(() => isSkill.value ? '技能' : '记忆')

const copyContent = async () => {
  if (asset.value.content) {
    await navigator.clipboard.writeText(asset.value.content)
    toast.success('内容已复制到剪贴板')
  }
}

const toggleFavorite = async () => {
  if (!asset.value.id) return
  try {
    const newVal = isSkill.value
      ? await invoke('toggle_favorite', { skillId: asset.value.id })
      : await invoke('toggle_memory_favorite', { memoryId: asset.value.id })
    emit('favorite-toggled', asset.value.id, newVal, props.type)
    toast.success(newVal ? '已收藏' : '已取消收藏')
  } catch (err) {
    toast.error('操作失败')
  }
}

const openInFinder = async () => {
  if (asset.value.local_path) {
    await invoke('open_in_finder', { path: asset.value.local_path })
  }
}

const openInEditor = async () => {
  if (asset.value.local_path) {
    await invoke('open_in_editor', { path: asset.value.local_path })
  }
}

const startEditing = () => {
  draftName.value = asset.value.name || ''
  draftTags.value = asset.value.tags || ''
  draftContent.value = asset.value.content || ''
  editing.value = true
}

const cancelEditing = () => {
  editing.value = false
}

const save = async () => {
  if (!draftName.value.trim()) {
    toast.error('请填写名称')
    return
  }
  const name = draftName.value.trim()
  const tags = draftTags.value.trim() || null
  try {
    if (props.isNew) {
      if (isSkill.value) {
        await invoke('create_skill', { name, content: draftContent.value, sourceTool: 'memex_native', tags })
      } else {
        await invoke('create_memory', { name, content: draftContent.value, sourceTool: 'memex_native', tags })
      }
    } else {
      if (isSkill.value) {
        await invoke('update_skill', { id: asset.value.id, name, content: draftContent.value, tags })
      } else {
        await invoke('update_memory', { id: asset.value.id, name, content: draftContent.value, tags })
      }
    }
    toast.success(props.isNew ? '创建成功' : '已保存')
    emit('saved')
  } catch (err) {
    toast.error('保存失败: ' + err)
  }
}

const remove = async () => {
  if (!asset.value.id) return
  const confirmed = window.confirm(`确定删除「${asset.value.name}」吗？此操作不可撤销。`)
  if (!confirmed) return
  try {
    if (isSkill.value) await invoke('delete_skill', { id: asset.value.id })
    else await invoke('delete_memory', { id: asset.value.id })
    toast.success('已删除')
    emit('deleted')
  } catch (err) {
    toast.error('删除失败: ' + err)
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
            v-if="asset.id"
            @click="toggleFavorite"
            class="p-1.5 rounded-lg transition-all shrink-0"
            :class="asset.is_favorite ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/30 hover:text-yellow-400/60 hover:bg-white/5'"
          >
            <Star :size="18" :class="{ 'fill-current': asset.is_favorite }" />
          </button>
          <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner" :class="sourceColor">
            <component :is="typeIcon" :size="16" />
          </div>
          <h2 class="text-xl font-semibold text-white truncate">
            {{ props.isNew ? `新建${typeLabel}` : asset.name }}
          </h2>
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
          {{ asset.source_tool || 'memex_native' }}
        </span>
        <span class="px-2 py-1 rounded text-[10px] font-medium bg-white/10 text-white/60 border border-white/10">
          {{ typeLabel }}
        </span>
        <div v-if="asset.tags && !editing" class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in asset.tags.split(',')"
            :key="tag"
            class="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
          >
            #{{ tag.trim() }}
          </span>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- View Mode -->
        <template v-if="!editing">
          <div class="bg-black/30 rounded-xl p-6 border border-white/5 shadow-inner">
            <pre class="text-sm font-mono text-white/80 whitespace-pre-wrap leading-relaxed break-words">{{ asset.content }}</pre>
          </div>

          <!-- File path (skills only) -->
          <div v-if="isSkill && asset.local_path" class="mt-4 px-1">
            <p class="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">文件路径</p>
            <div class="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 border border-white/5">
              <code class="text-xs text-white/50 font-mono truncate flex-1">{{ asset.local_path }}</code>
              <button
                @click="openInFinder"
                class="p-1.5 text-white/40 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all shrink-0"
                title="在文件管理器中显示"
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
          <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-white/30 px-1">
            <div v-if="isSkill">
              <p class="uppercase tracking-widest text-[10px] mb-1">创建于</p>
              <p class="font-mono">{{ asset.created_at ? new Date(asset.created_at).toLocaleString() : '—' }}</p>
            </div>
            <div>
              <p class="uppercase tracking-widest text-[10px] mb-1">更新于</p>
              <p class="font-mono">{{ new Date(asset.updated_at || asset.extracted_at).toLocaleString() }}</p>
            </div>
          </div>
        </template>

        <!-- Edit Mode -->
        <template v-else>
          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">名称</label>
              <input
                v-model="draftName"
                type="text"
                placeholder="资产名称"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder-white/20"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">标签 (逗号分隔)</label>
              <input
                v-model="draftTags"
                type="text"
                placeholder="tag1, tag2"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder-white/20"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">内容 (Markdown)</label>
              <textarea
                v-model="draftContent"
                rows="16"
                placeholder="在此输入内容..."
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder-white/20 resize-none leading-relaxed"
              ></textarea>
            </div>
          </div>
        </template>
      </div>

      <!-- Bottom Action Bar -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0 bg-black/20">
        <template v-if="!editing">
          <button
            v-if="asset.id"
            @click="remove"
            class="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm transition-all"
          >
            <Trash2 :size="14" />
            删除
          </button>
          <button
            v-if="isSkill && asset.local_path"
            @click="openInEditor"
            class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all"
          >
            <ExternalLink :size="14" />
            打开文件
          </button>
          <button
            v-if="asset.content"
            @click="copyContent"
            class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all"
          >
            <Copy :size="14" />
            复制
          </button>
          <button
            @click="startEditing"
            class="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            <Pencil :size="14" />
            编辑
          </button>
        </template>
        <template v-else>
          <button
            @click="cancelEditing"
            class="flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all"
          >
            取消
          </button>
          <button
            @click="save"
            class="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            <Save :size="14" />
            保存
          </button>
        </template>
      </div>
    </div>
  </Transition>
</template>
