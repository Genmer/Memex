<script setup lang="ts">
import { useToast } from '../composables/useToast'
import { CheckCircle, XCircle, Info } from 'lucide-vue-next'

const { toasts } = useToast()

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colorMap = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  info: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="translate-x-8 opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-8 opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-2xl shadow-2xl min-w-[280px] max-w-[400px]"
          :class="colorMap[toast.type]"
        >
          <component :is="iconMap[toast.type]" :size="18" class="shrink-0" />
          <span class="text-sm font-medium">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
