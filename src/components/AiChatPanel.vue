<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { X, Send, Bot, User, Sparkles, Loader2, CheckCircle } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const toast = useToast()

const props = defineProps<{
  visible: boolean,
  initialQuery?: string,
  skillContext?: string
}>()

const emit = defineEmits(['close', 'config-updated'])

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  rawBuffer?: string
  isStreaming?: boolean
  error?: string
  actions?: any[]
}

const quickQuestions = [
  "为什么扫描不到 zcode 技能？",
  "记忆库为什么是空的？",
  "帮我检查当前的配置状态"
]

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isGenerating = ref(false)
const messagesContainer = ref<HTMLDivElement | null>(null)
let unlistenStream: (() => void) | null = null

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
  // Also scroll any streaming blocks
  document.querySelectorAll('.ai-streaming-block').forEach((el) => {
    el.scrollTop = el.scrollHeight
  })
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isGenerating.value) return

  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  messages.value.push({ role: 'assistant', content: '', rawBuffer: '', isStreaming: true, actions: [] })
  isGenerating.value = true
  await scrollToBottom()

  try {
    await invoke('chat_with_ai', {
      message: text,
      context: props.skillContext || ''
    })
  } catch (err) {
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg.role === 'assistant') {
      lastMsg.error = '调用失败: ' + err
      lastMsg.isStreaming = false
    }
    isGenerating.value = false
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const sendQuickQuestion = (q: string) => {
  inputText.value = q
  sendMessage()
}

const handleAction = async (action: any) => {
  if (action.type === 'SET_CONFIG') {
    try {
      await invoke('save_config', { keyName: action.key, keyValue: action.value })
      toast.success('配置已更新')
      emit('config-updated')
      // Mark as applied
      action.applied = true
      // System feedback back to AI
      messages.value.push({ role: 'user', content: `[系统消息] 我已同意并将 ${action.key} 设置为 ${action.value}。请继续。` })
      messages.value.push({ role: 'assistant', content: '', rawBuffer: '', isStreaming: true, actions: [] })
      isGenerating.value = true
      await scrollToBottom()
      
      await invoke('chat_with_ai', {
        message: `[系统消息] 用户已同意并将 ${action.key} 设置为 ${action.value}。请确认并继续下一步指导。`,
        context: props.skillContext || ''
      })
    } catch (err) {
      toast.error('配置更新失败: ' + err)
    }
  }
}

onMounted(async () => {
  unlistenStream = await listen('ai-stream-chunk', (event: any) => {
    const payload = event.payload as { content: string, done: boolean, error?: string }
    const lastMsg = messages.value[messages.value.length - 1]
    
    if (!lastMsg || lastMsg.role !== 'assistant') return

    if (payload.error) {
      lastMsg.error = payload.error
      lastMsg.isStreaming = false
      isGenerating.value = false
      return
    }

    if (payload.done) {
      lastMsg.isStreaming = false
      isGenerating.value = false
      return
    }

    lastMsg.rawBuffer = (lastMsg.rawBuffer || '') + payload.content
    
    // Parse actions
    let text = lastMsg.rawBuffer
    const actionRegex = /<<<ACTION:\s*(\{.*?\})\s*>+/g
    let match
    if (!lastMsg.actions) lastMsg.actions = []
    
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const actionObj = JSON.parse(match[1])
        if (!lastMsg.actions.find(a => a.key === actionObj.key && a.value === actionObj.value)) {
          lastMsg.actions.push(actionObj)
        }
      } catch (e) {
        console.error("Action parse error", e)
      }
    }
    
    // Strip fully formed actions
    text = text.replace(actionRegex, '')
    // Strip partial actions to prevent flickering
    text = text.replace(/<<<[^>]*$/, '')
    
    lastMsg.content = text
    scrollToBottom()
  })
})

onUnmounted(() => {
  if (unlistenStream) unlistenStream()
})

// If opened with an initial query, auto-send
watch(() => props.visible, (val) => {
  if (val && props.initialQuery) {
    inputText.value = props.initialQuery
    nextTick(() => sendMessage())
  }
})
</script>

<template>
  <!-- Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div v-if="visible" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="emit('close')" />
  </Transition>

  <!-- Panel -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="translate-x-full"
    leave-to-class="translate-x-full"
  >
    <div v-if="visible" class="fixed top-0 right-0 z-50 w-[520px] max-w-[90vw] h-screen flex flex-col bg-[#0a0b0f]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.8)]">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles :size="16" class="text-white" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-white">Memex AI</h3>
            <p class="text-[10px] text-white/40 font-mono">deepseek-v4-flash</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
          <X :size="18" />
        </button>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Welcome message if empty -->
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-6">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-5">
            <Bot :size="28" class="text-indigo-400" />
          </div>
          <h4 class="text-lg font-medium text-white/80 mb-2">你好，我是 Memex AI 助手</h4>
          <p class="text-sm text-white/40 leading-relaxed max-w-xs mb-8">
            你可以问我关于技能搜索、配置建议、或者任何关于你的 Agent 资产库的问题。
          </p>
          
          <!-- Quick Questions -->
          <div class="w-full space-y-2">
            <button 
              v-for="q in quickQuestions" 
              :key="q"
              @click="sendQuickQuestion(q)"
              class="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl text-sm text-white/70 hover:text-white transition-all text-left flex items-center justify-between group"
            >
              {{ q }}
              <Sparkles :size="14" class="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
            </button>
          </div>
        </div>

        <!-- Chat bubbles -->
        <div v-for="(msg, i) in messages" :key="i" class="flex gap-3" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <!-- Avatar -->
          <div v-if="msg.role === 'assistant'" class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
            <Bot :size="14" class="text-white" />
          </div>

          <!-- Bubble -->
          <div 
            class="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
            :class="msg.role === 'user' 
              ? 'bg-indigo-600 text-white rounded-br-md shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
              : 'bg-white/5 text-white/85 border border-white/10 rounded-bl-md shadow-lg'"
          >
            <!-- Error -->
            <div v-if="msg.error" class="text-red-400 text-sm">
              ⚠️ {{ msg.error }}
            </div>
            
            <!-- Content -->
            <div v-else class="flex flex-col gap-3">
              <!-- Streaming State -->
              <div v-if="msg.isStreaming" class="ai-streaming-block ml-3 h-[3.2rem] overflow-y-auto bg-black/20 rounded-md p-2 border-l-2 border-white/20 text-white/50 text-xs" style="scrollbar-width: none;">
                <pre class="whitespace-pre-wrap font-sans break-words inline">{{ msg.content }}</pre>
                <span class="inline-block w-1.5 h-3 bg-white/50 ml-0.5 animate-pulse rounded-sm align-middle" />
              </div>
              
              <!-- Completed State -->
              <div v-else>
                <pre class="whitespace-pre-wrap font-sans break-words">{{ msg.content }}</pre>
              </div>
              
              <!-- Action Cards -->
              <div v-if="msg.actions && msg.actions.length > 0" class="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
                <div v-for="(action, aIdx) in msg.actions" :key="aIdx" class="bg-black/30 rounded-lg p-3 border border-indigo-500/30 shadow-inner">
                  <p class="text-xs text-indigo-300 font-medium mb-1">AI 提议配置变更</p>
                  <p class="text-xs text-white/70 font-mono mb-2 break-all">{{ action.key }} = {{ action.value }}</p>
                  <button 
                    v-if="!action.applied"
                    @click="handleAction(action)"
                    class="w-full py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs rounded-md font-medium transition-colors"
                  >
                    确认并应用
                  </button>
                  <div v-else class="flex items-center gap-1.5 text-xs text-emerald-400 font-medium py-1.5 justify-center bg-emerald-500/10 rounded-md">
                    <CheckCircle :size="14" /> 已应用
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- User avatar -->
          <div v-if="msg.role === 'user'" class="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
            <User :size="14" class="text-white/70" />
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="shrink-0 p-4 border-t border-white/10 bg-black/30">
        <div class="flex items-end gap-3">
          <div class="flex-1 relative">
            <textarea
              v-model="inputText"
              @keydown="handleKeydown"
              :placeholder="isGenerating ? 'AI 正在思考中...' : '输入你的问题... (Enter 发送)'"
              :disabled="isGenerating"
              rows="1"
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-none transition-all disabled:opacity-50 shadow-inner"
              style="min-height: 44px; max-height: 120px;"
            />
          </div>
          <button
            @click="sendMessage"
            :disabled="isGenerating || !inputText.trim()"
            class="p-3 rounded-xl transition-all shrink-0 disabled:opacity-30"
            :class="isGenerating 
              ? 'bg-white/5 text-white/30' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'"
          >
            <Loader2 v-if="isGenerating" :size="18" class="animate-spin" />
            <Send v-else :size="18" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
