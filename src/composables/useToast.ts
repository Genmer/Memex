import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = ref<ToastItem[]>([])
let nextId = 0

export function useToast() {
  const show = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  const success = (msg: string, duration = 3000) => show(msg, 'success', duration)
  const error = (msg: string, duration = 4000) => show(msg, 'error', duration)
  const info = (msg: string, duration = 3000) => show(msg, 'info', duration)

  return { toasts, show, success, error, info }
}

