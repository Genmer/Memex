import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useToast } from './useToast'

export interface BatchItem {
  id: number
  name: string
}

export function useAiBatchQueue() {
  const toast = useToast()

  const isRunning = ref(false)
  const isMinimized = ref(false)
  const totalCount = ref(0)
  const completedCount = ref(0)
  const failedCount = ref(0)
  const currentItemName = ref('')
  const isCancelled = ref(false)

  const progressPercent = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.min(100, Math.round((completedCount.value / totalCount.value) * 100))
  })

  // Start processing a list of skills with concurrent worker pool
  const startBatch = async (
    items: BatchItem[],
    onItemSuccess?: (result: any) => void,
    concurrency = 3
  ) => {
    if (items.length === 0 || isRunning.value) return

    isRunning.value = true
    isCancelled.value = false
    totalCount.value = items.length
    completedCount.value = 0
    failedCount.value = 0
    currentItemName.value = items[0]?.name || ''

    let currentIndex = 0

    // Concurrent worker loop
    const worker = async () => {
      while (currentIndex < items.length && !isCancelled.value) {
        const item = items[currentIndex++]
        if (!item) break
        currentItemName.value = item.name

        try {
          const res: any = await invoke('analyze_skill_ai', { skillId: item.id })
          completedCount.value++
          if (onItemSuccess) {
            onItemSuccess(res)
          }
        } catch (err) {
          console.error(`Failed to analyze skill ${item.id} (${item.name}):`, err)
          failedCount.value++
          completedCount.value++
        }
      }
    }

    const workers = []
    const actualConcurrency = Math.min(concurrency, items.length)
    for (let i = 0; i < actualConcurrency; i++) {
      workers.push(worker())
    }

    await Promise.all(workers)

    if (isCancelled.value) {
      toast.info(`批量解析已挂起中断，已完成 ${completedCount.value}/${totalCount.value} 项`)
    } else {
      toast.success(`🎉 批量解析完成！成功提炼 ${completedCount.value - failedCount.value} 项技能释义`)
    }

    isRunning.value = false
  }

  const cancelBatch = () => {
    if (isRunning.value) {
      isCancelled.value = true
      isRunning.value = false
    }
  }

  const toggleMinimize = () => {
    isMinimized.value = !isMinimized.value
  }

  return {
    isRunning,
    isMinimized,
    totalCount,
    completedCount,
    failedCount,
    progressPercent,
    currentItemName,
    startBatch,
    cancelBatch,
    toggleMinimize
  }
}
