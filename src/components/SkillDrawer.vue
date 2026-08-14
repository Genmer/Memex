<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { 
  X, Copy, FolderOpen, FileEdit, Star, ExternalLink, Pencil, Trash2, 
  Save, BookOpen, Terminal, Sparkles, Link as LinkIcon, Sliders, Check,
  ChevronDown, Rocket, Loader2
} from 'lucide-vue-next'
import MarkdownViewer from './MarkdownViewer.vue'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  skill: any
  type?: 'skill' | 'memory'
  isNew?: boolean
  allSkills?: any[]
  allMemories?: any[]
}>()

const emit = defineEmits(['close', 'favorite-toggled', 'saved', 'deleted', 'select-asset', 'run-in-ai'])

const isSkill = computed(() => props.type !== 'memory')
const asset = computed(() => props.skill || {})

const activeTab = ref<'content' | 'composer' | 'related'>('content')

const editing = ref(false)
const draftName = ref('')
const draftTags = ref('')
const draftContent = ref('')
const isAnalyzingAi = ref(false)

// Composer state
const composerPrefix = ref('')
const composerUserTask = ref('')
const copiedComposer = ref(false)

watch(() => props.skill, () => {
  if (props.skill) {
    draftName.value = props.skill.name || ''
    draftTags.value = props.skill.tags || ''
    draftContent.value = props.skill.content || ''
    composerPrefix.value = props.skill.prefix_template || (isSkill.value ? '请严格遵守以下 Skill 规范回答：' : '')
    composerUserTask.value = ''
    editing.value = !!props.isNew
    activeTab.value = 'content'
  }
}, { immediate: true })

const sourceColor = computed(() => {
  const source = (asset.value.source_tool || '').toLowerCase()
  if (source.includes('zcode')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  if (source.includes('claude')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
  if (source.includes('trae')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  if (source.includes('hermes')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
})

const typeIcon = computed(() => isSkill.value ? Terminal : BookOpen)
const typeLabel = computed(() => isSkill.value ? '技能' : '记忆')

const analyzeSkillAi = async () => {
  if (!asset.value.id || !isSkill.value || isAnalyzingAi.value) return
  isAnalyzingAi.value = true
  try {
    const res: any = await invoke('analyze_skill_ai', { skillId: asset.value.id })
    asset.value.summary_zh = res.summary_zh
    asset.value.category_zh = res.category_zh
    asset.value.tags_zh = res.tags_zh.join(', ')
    asset.value.tags = res.merged_tags
    toast.success(`已提炼用途: ${res.summary_zh}`)
    emit('saved')
  } catch (err: any) {
    toast.error(typeof err === 'string' ? err : `AI 解析失败: ${JSON.stringify(err)}`)
  } finally {
    isAnalyzingAi.value = false
  }
}

// Composed prompt preview
const composedPrompt = computed(() => {
  const parts: string[] = []
  if (composerPrefix.value.trim()) {
    parts.push(composerPrefix.value.trim())
  }
  if (asset.value.content) {
    parts.push(asset.value.content)
  }
  if (composerUserTask.value.trim()) {
    parts.push(`\n---\n【任务需求与输入】:\n${composerUserTask.value.trim()}`)
  }
  return parts.join('\n\n')
})

const copyComposedPrompt = async () => {
  await navigator.clipboard.writeText(composedPrompt.value)
  copiedComposer.value = true
  toast.success('已复制组装后的完整 Prompt')
  setTimeout(() => { copiedComposer.value = false }, 2000)
}

const runInAiAssistant = () => {
  emit('run-in-ai', composedPrompt.value)
  emit('close')
}

// Related assets discovery
const relatedAssets = computed(() => {
  if (!asset.value || !asset.value.tags) return []
  const currentTags = asset.value.tags
    .toLowerCase()
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean)
  
  if (currentTags.length === 0) return []

  const results: { asset: any, type: 'skill' | 'memory', score: number }[] = []

  // Check in skills
  if (props.allSkills) {
    props.allSkills.forEach(s => {
      if (s.id === asset.value.id && isSkill.value) return
      if (!s.tags) return
      const sTags = s.tags.toLowerCase().split(',').map((t: string) => t.trim())
      const overlap = currentTags.filter((t: string) => sTags.includes(t))
      if (overlap.length > 0) {
        results.push({ asset: s, type: 'skill', score: overlap.length })
      }
    })
  }

  // Check in memories
  if (props.allMemories) {
    props.allMemories.forEach(m => {
      if (m.id === asset.value.id && !isSkill.value) return
      if (!m.tags) return
      const mTags = m.tags.toLowerCase().split(',').map((t: string) => t.trim())
      const overlap = currentTags.filter((t: string) => mTags.includes(t))
      if (overlap.length > 0) {
        results.push({ asset: m, type: 'memory', score: overlap.length })
      }
    })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 6)
})

// Deploy skill to other tool directories
const isDeploying = ref(false)
const showDeployMenu = ref(false)

const deploySkill = async (targetTool: string) => {
  if (!asset.value.id || !isSkill.value) return
  isDeploying.value = true
  showDeployMenu.value = false
  try {
    const res: string = await invoke('deploy_skill_to_target', {
      skillId: asset.value.id,
      targetTool: targetTool
    })
    toast.success(`已成功分发到 ${targetTool.toUpperCase()}: ${res}`)
  } catch (err) {
    toast.error(`分发失败: ${err}`)
  } finally {
    isDeploying.value = false
  }
}

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
        await invoke('create_skill', {
          name,
          content: draftContent.value,
          sourceTool: 'memex_native',
          tags
        })
      } else {
        await invoke('create_memory', {
          name,
          content: draftContent.value,
          sourceTool: 'memex_native',
          tags
        })
      }
      toast.success('创建成功')
    } else {
      if (isSkill.value) {
        await invoke('update_skill', {
          id: asset.value.id,
          name,
          content: draftContent.value,
          tags
        })
      } else {
        await invoke('update_memory', {
          id: asset.value.id,
          name,
          content: draftContent.value,
          tags
        })
      }
      toast.success('保存成功')
    }
    editing.value = false
    emit('saved')
  } catch (err) {
    toast.error('保存失败: ' + err)
  }
}

const remove = async () => {
  if (!asset.value.id) return
  if (!confirm(`确定要删除此${typeLabel.value}吗？`)) return
  try {
    if (isSkill.value) {
      await invoke('delete_skill', { id: asset.value.id })
    } else {
      await invoke('delete_memory', { id: asset.value.id })
    }
    toast.success('删除成功')
    emit('deleted', asset.value.id, props.type)
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
      class="fixed top-0 right-0 z-50 w-[640px] max-w-[90vw] h-screen flex flex-col bg-[#0f1117]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.8)] text-white"
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
          <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-inner border" :class="sourceColor">
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

      <!-- Navigation Tabs (Only in view mode) -->
      <div v-if="!editing && !props.isNew" class="flex items-center px-6 border-b border-white/10 shrink-0 bg-black/10">
        <button
          @click="activeTab = 'content'"
          class="px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5"
          :class="activeTab === 'content' ? 'border-indigo-500 text-indigo-300 font-semibold' : 'border-transparent text-white/50 hover:text-white/80'"
        >
          <FileEdit :size="13" />
          资产内容
        </button>
        <button
          @click="activeTab = 'composer'"
          class="px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5"
          :class="activeTab === 'composer' ? 'border-indigo-500 text-indigo-300 font-semibold' : 'border-transparent text-white/50 hover:text-white/80'"
        >
          <Sliders :size="13" />
          组装/试运行 (Playground)
        </button>
        <button
          @click="activeTab = 'related'"
          class="px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5"
          :class="activeTab === 'related' ? 'border-indigo-500 text-indigo-300 font-semibold' : 'border-transparent text-white/50 hover:text-white/80'"
        >
          <LinkIcon :size="13" />
          关联资产 ({{ relatedAssets.length }})
        </button>
      </div>

      <!-- Meta bar -->
      <div class="px-6 py-3 flex items-center gap-3 border-b border-white/5 shrink-0 flex-wrap bg-black/5">
        <span
          class="px-3 py-1 rounded-lg text-xs font-semibold tracking-wider uppercase border font-mono"
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
          <!-- TAB 1: CONTENT PREVIEW -->
          <div v-if="activeTab === 'content'" class="space-y-6">

            <!-- AI Semantic Purpose Insight Card -->
            <div v-if="isSkill" class="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/5 p-5 shadow-xl relative overflow-hidden">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Sparkles :size="14" />
                  </div>
                  <h3 class="text-sm font-semibold text-white/90">AI 核心用途解读</h3>
                  <span v-if="asset.category_zh" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-500/30 font-mono">
                    {{ asset.category_zh }}
                  </span>
                </div>
                <button
                  @click="analyzeSkillAi"
                  :disabled="isAnalyzingAi"
                  class="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Loader2 v-if="isAnalyzingAi" :size="12" class="animate-spin" />
                  <Sparkles v-else :size="12" />
                  <span>{{ asset.summary_zh ? '重新提炼' : '一键 AI 解析' }}</span>
                </button>
              </div>

              <div v-if="asset.summary_zh">
                <p class="text-sm text-white/90 leading-relaxed font-sans font-medium mb-3">
                  {{ asset.summary_zh }}
                </p>
                <div v-if="asset.tags_zh" class="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-white/10">
                  <span class="text-[10px] text-white/40 mr-1">中文标签:</span>
                  <span
                    v-for="tag in asset.tags_zh.split(',')"
                    :key="tag"
                    class="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-indigo-200 border border-white/10"
                  >
                    #{{ tag.trim() }}
                  </span>
                </div>
              </div>
              <div v-else class="text-xs text-white/50 leading-relaxed">
                暂未提炼中文释义。针对纯英文或复杂的技能指令，点击右上角【一键 AI 解析】，将自动提炼通俗中文用途、业务场景与分类标签。
              </div>
            </div>

            <MarkdownViewer :content="asset.content || ''" />

            <!-- File path (skills only) -->
            <div v-if="isSkill && asset.local_path" class="mt-6 px-1">
              <p class="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-mono">文件路径</p>
              <div class="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 border border-white/5">
                <code class="text-xs text-white/50 font-mono truncate flex-1">{{ asset.local_path }}</code>
                <button
                  @click="openInFinder"
                  class="p-1.5 text-white/40 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-all shrink-0"
                  title="在文件管理器中显示"
                >
                  <FolderOpen :size="14" />
                </button>
                <button
                  @click="openInEditor"
                  class="p-1.5 text-white/40 hover:text-emerald-500 hover:bg-emerald-500/10 rounded transition-all shrink-0"
                  title="用编辑器打开"
                >
                  <FileEdit :size="14" />
                </button>
              </div>
            </div>

            <!-- Timestamps -->
            <div class="mt-6 grid grid-cols-2 gap-4 text-xs text-white/30 px-1">
              <div v-if="isSkill">
                <p class="uppercase tracking-widest text-[10px] mb-1 font-mono">创建于</p>
                <p class="font-mono">{{ asset.created_at ? new Date(asset.created_at).toLocaleString() : '—' }}</p>
              </div>
              <div>
                <p class="uppercase tracking-widest text-[10px] mb-1 font-mono">更新于</p>
                <p class="font-mono">{{ new Date(asset.updated_at || asset.extracted_at).toLocaleString() }}</p>
              </div>
            </div>
          </div>

          <!-- TAB 2: PROMPT COMPOSER & PLAYGROUND -->
          <div v-else-if="activeTab === 'composer'" class="space-y-4">
            <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed flex items-start gap-2.5">
              <Sparkles :size="16" class="shrink-0 mt-0.5" />
              <span>动态提示词组装器：支持输入具体的任务参数，自动结合前缀规范与技能核心逻辑生成最终 Prompt，可一键发送给 AI 运行。</span>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">前缀约束模板 (Prefix Template)</label>
              <input
                v-model="composerPrefix"
                type="text"
                placeholder="例如：请严格遵守以下 Skill 规范回答："
                class="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">实际需求 / 待处理任务 (User Task)</label>
              <textarea
                v-model="composerUserTask"
                rows="3"
                placeholder="输入你要让 AI 依据此技能解决的具体需求或代码片段..."
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none font-mono"
              ></textarea>
            </div>

            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">实时完整提示词预览 (Composed Prompt)</label>
                <button
                  @click="copyComposedPrompt"
                  class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs transition-colors flex items-center gap-1 font-mono"
                >
                  <component :is="copiedComposer ? Check : Copy" :size="12" />
                  {{ copiedComposer ? '已复制' : '复制完整提示词' }}
                </button>
              </div>
              <div class="bg-black/40 rounded-xl p-4 border border-white/10 max-h-56 overflow-y-auto font-mono text-xs text-white/80 leading-relaxed whitespace-pre-wrap">
                {{ composedPrompt }}
              </div>
            </div>

            <button
              @click="runInAiAssistant"
              class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles :size="14" />
              在内置 AI 助手测试运行
            </button>
          </div>

          <!-- TAB 3: RELATED ASSETS -->
          <div v-else-if="activeTab === 'related'" class="space-y-3">
            <p class="text-xs text-white/40 mb-3">基于标签关联度与命名语义自动挖掘的相似 Agent 资产：</p>
            
            <div v-if="relatedAssets.length > 0" class="space-y-2.5">
              <div
                v-for="rel in relatedAssets"
                :key="rel.asset.id + rel.type"
                @click="emit('select-asset', rel.asset, rel.type)"
                class="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-center gap-2 min-w-0">
                    <component :is="rel.type === 'skill' ? Terminal : BookOpen" :size="14" class="text-indigo-400 shrink-0" />
                    <span class="text-sm font-medium text-white/90 group-hover:text-indigo-300 transition-colors truncate">
                      {{ rel.asset.name }}
                    </span>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/50 uppercase font-mono">
                    {{ rel.asset.source_tool }}
                  </span>
                </div>
                <p class="text-xs text-white/50 line-clamp-2 font-mono leading-relaxed">
                  {{ rel.asset.content }}
                </p>
                <div v-if="rel.asset.tags" class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-for="t in rel.asset.tags.split(',')"
                    :key="t"
                    class="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40"
                  >
                    #{{ t.trim() }}
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="py-12 text-center text-white/30 text-xs border border-dashed border-white/10 rounded-xl">
              暂未检测到具有相同标签的相关资产
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
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-white placeholder-white/20"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">标签 (逗号分隔)</label>
              <input
                v-model="draftTags"
                type="text"
                placeholder="tag1, tag2"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-white placeholder-white/20"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-white/60 uppercase tracking-wider">内容 (Markdown)</label>
              <textarea
                v-model="draftContent"
                rows="16"
                placeholder="在此输入内容..."
                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500/50 text-white placeholder-white/20 resize-none leading-relaxed"
              ></textarea>
            </div>
          </div>
        </template>
      </div>

      <!-- Bottom Action Bar -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0 bg-black/20">
        <template v-if="!editing">
          <div class="flex items-center gap-2">
            <button
              v-if="asset.id"
              @click="remove"
              class="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs transition-all"
              title="删除资产"
            >
              <Trash2 :size="13" />
              删除
            </button>

            <!-- Deploy to Target Dropdown (Skills only) -->
            <div v-if="isSkill && asset.id" class="relative">
              <button
                @click="showDeployMenu = !showDeployMenu"
                class="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-medium transition-all"
                :disabled="isDeploying"
              >
                <Rocket :size="13" />
                <span>分发至工具</span>
                <ChevronDown :size="12" />
              </button>

              <div
                v-if="showDeployMenu"
                class="absolute bottom-full left-0 mb-2 w-52 bg-[#161922] border border-white/15 rounded-xl shadow-2xl p-1.5 z-30 space-y-1"
              >
                <p class="px-2 py-1 text-[10px] uppercase font-mono text-white/40 tracking-wider">选择分发环境</p>
                <button
                  @click="deploySkill('claude')"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span>Claude Code</span>
                  <code class="text-[10px] text-white/40">~/.claude</code>
                </button>
                <button
                  @click="deploySkill('agents')"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span>Agents CLI</span>
                  <code class="text-[10px] text-white/40">~/.agents</code>
                </button>
                <button
                  @click="deploySkill('zcode')"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span>ZCode Plugin</span>
                  <code class="text-[10px] text-white/40">~/.gemini</code>
                </button>
                <button
                  @click="deploySkill('cursor')"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span>Cursor Rules</span>
                  <code class="text-[10px] text-white/40">.cursorrules</code>
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="isSkill && asset.local_path"
              @click="openInEditor"
              class="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/70 hover:text-white transition-all"
            >
              <ExternalLink :size="13" />
              打开文件
            </button>
            <button
              v-if="asset.content"
              @click="copyContent"
              class="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/70 hover:text-white transition-all"
            >
              <Copy :size="13" />
              复制
            </button>
            <button
              @click="startEditing"
              class="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-sm transition-all"
            >
              <Pencil :size="13" />
              编辑
            </button>
          </div>
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
            class="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
          >
            <Save :size="14" />
            保存
          </button>
        </template>
      </div>
    </div>
  </Transition>
</template>
