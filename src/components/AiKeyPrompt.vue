<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Key, Sparkles, ExternalLink } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close', 'saved'])

const apiKey = ref('')
const model = ref('deepseek-v4-flash')
const isSaving = ref(false)

const saveKey = async () => {
  if (!apiKey.value.trim()) {
    toast.error('请输入 API Key')
    return
  }
  isSaving.value = true
  try {
    await invoke('save_config', { keyName: 'DEEPSEEK_API_KEY', keyValue: apiKey.value.trim() })
    await invoke('save_config', { keyName: 'AI_MODEL', keyValue: model.value })
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
    <div v-if="visible" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md">
      <Transition
        enter-active-class="transition-all duration-300 delay-100"
        leave-active-class="transition-all duration-200"
        enter-from-class="opacity-0 scale-95 translate-y-4"
        leave-to-class="opacity-0 scale-95 translate-y-4"
      >
        <div v-if="visible" class="bg-white dark:bg-[#0f1117]/95 border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden text-slate-800 dark:text-white">
          <!-- Header gradient bar -->
          <div class="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div class="p-8">
            <!-- Icon -->
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 flex items-center justify-center mb-6">
              <Sparkles :size="24" class="text-indigo-600 dark:text-indigo-400" />
            </div>

            <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">配置 AI 助手</h3>
            <p class="text-sm text-slate-500 dark:text-white/50 mb-6 leading-relaxed">
              Memex 使用 DeepSeek AI 来帮助你搜索和管理技能资产。请输入你的 API Key 开始使用。
            </p>

            <!-- API Key Input -->
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-medium text-slate-600 dark:text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Key :size="12" />
                  DeepSeek API Key
                </label>
                <input 
                  v-model="apiKey"
                  type="password"
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner font-mono"
                  @keydown.enter="saveKey"
                />
              </div>
              
              <div class="space-y-2">
                <label class="text-xs font-medium text-slate-600 dark:text-white/60 uppercase tracking-wider">模型</label>
                <input 
                  v-model="model"
                  type="text"
                  class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner font-mono"
                />
              </div>

              <a 
                href="https://platform.deepseek.com/api_keys" 
                target="_blank"
                class="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <ExternalLink :size="12" />
                前往 DeepSeek 获取 API Key
              </a>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200/80 dark:border-white/10">
              <button 
                @click="emit('close')"
                class="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
              >
                稍后配置
              </button>
              <button
                @click="saveKey"
                :disabled="isSaving || !apiKey.trim()"
                class="px-6 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all disabled:opacity-40 disabled:shadow-none flex items-center gap-2"
              >
                <Sparkles v-if="!isSaving" :size="14" />
                <svg v-else class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ isSaving ? '保存中...' : '保存并启用' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
