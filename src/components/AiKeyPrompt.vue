<script setup lang="ts">
import { ref } from 'vue'
import { Key, Sparkles, ExternalLink, X } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close', 'saved'])

const apiKey = ref(localStorage.getItem('memex_ai_key') || '')
const model = ref(localStorage.getItem('memex_ai_model') || 'deepseek-chat')
const isSaving = ref(false)

const handleDismiss = () => {
  localStorage.setItem('ai_prompt_dismissed', 'true')
  sessionStorage.setItem('ai_prompt_dismissed', 'true')
  emit('close')
}

const saveKey = async () => {
  if (!apiKey.value.trim()) {
    toast.error('请输入 API Key')
    return
  }
  isSaving.value = true
  try {
    const keyVal = apiKey.value.trim()
    const modelVal = model.value.trim() || 'deepseek-chat'

    localStorage.setItem('memex_ai_key', keyVal)
    localStorage.setItem('memex_ai_model', modelVal)
    localStorage.setItem('ai_prompt_dismissed', 'true')

    if (typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__)) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('save_config', { keyName: 'DEEPSEEK_API_KEY', keyValue: keyVal })
      await invoke('save_config', { keyName: 'AI_MODEL', keyValue: modelVal })
    }

    toast.success('AI 配置已保存')
    emit('saved')
    emit('close')
  } catch (err) {
    toast.error('保存失败: ' + err)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    leave-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="visible" 
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      @click.self="handleDismiss"
    >
      <Transition
        enter-active-class="transition-all duration-300 delay-100"
        leave-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-95 translate-y-4"
        leave-to-class="opacity-0 scale-95 translate-y-4"
      >
        <div 
          v-if="visible" 
          class="bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-white relative animate-scaleUp"
        >
          <!-- Close button -->
          <button 
            @click="handleDismiss"
            class="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="关闭 / 稍后配置"
          >
            <X :size="18" />
          </button>

          <!-- Header gradient bar -->
          <div class="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div class="p-6 sm:p-8">
            <!-- Icon -->
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
              <Sparkles :size="22" class="text-indigo-400" />
            </div>

            <h3 class="text-lg font-bold text-neutral-100 mb-1.5 flex items-center gap-2">
              <span>配置 AI 智能助手</span>
              <span class="text-[10px] font-normal font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">可选</span>
            </h3>
            <p class="text-xs text-neutral-400 mb-5 leading-relaxed">
              Memex 支持使用 DeepSeek AI 来帮助你搜索、总结与管理记忆与技能。如暂不需要，可随时点击下方「稍后再说」。
            </p>

            <!-- API Key Input -->
            <div class="space-y-3.5">
              <div class="space-y-1.5">
                <label class="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
                  <Key :size="12" class="text-indigo-400" />
                  DeepSeek API Key
                </label>
                <input 
                  v-model="apiKey"
                  type="password"
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  class="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  @keydown.enter="saveKey"
                />
              </div>
              
              <div class="space-y-1.5">
                <label class="text-[11px] font-medium text-neutral-300">模型名称</label>
                <input 
                  v-model="model"
                  type="text"
                  placeholder="deepseek-chat"
                  class="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              <div class="flex items-center justify-between text-xs pt-1">
                <a 
                  href="https://platform.deepseek.com/api_keys" 
                  target="_blank" 
                  class="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                >
                  <ExternalLink :size="11" />
                  前往获取 DeepSeek API Key ↗
                </a>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-neutral-800">
              <button 
                @click="handleDismiss"
                class="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                稍后再说 (跳过)
              </button>
              <button
                @click="saveKey"
                :disabled="isSaving || !apiKey.trim()"
                class="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles v-if="!isSaving" :size="13" />
                <svg v-else class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ isSaving ? '保存中...' : '保存配置' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
