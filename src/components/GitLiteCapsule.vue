<template>
  <div class="flex items-center">
    <button 
      @click="isModalOpen = true"
      class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm group hover:scale-[1.02] active:scale-[0.98]"
      :class="capsuleClasses">
      <!-- Icon / Status Dot -->
      <span class="relative flex h-2 w-2">
        <span v-if="gitliteStatus.syncState === 'syncing'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2" :class="dotClasses"></span>
      </span>

      <!-- Label -->
      <div class="flex items-center gap-1.5">
        <span class="text-neutral-200 font-semibold tracking-wide flex items-center gap-1">
          <svg class="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          GitLite
        </span>
        <span class="text-neutral-400 font-mono text-[11px]">|</span>
        <span class="font-mono text-[11px] text-neutral-300">{{ providerText }}</span>
      </div>

      <!-- Sync Status Pill -->
      <span class="px-1.5 py-0.2 text-[10px] rounded-md font-mono" :class="pillClasses">
        {{ syncText }}
      </span>

      <!-- Quick Sync Icon Button (When connected) -->
      <span 
        v-if="gitliteStatus.provider !== 'memory'"
        @click.stop="handleQuickSync"
        :title="isQuickSyncing ? '正在主动双向同步...' : '立即主动同步 (Pull & Push)'"
        class="ml-0.5 p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-emerald-300 transition-all">
        <svg :class="isQuickSyncing ? 'animate-spin text-emerald-400' : ''" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </span>
    </button>

    <GitLiteModal 
      :is-open="isModalOpen" 
      @close="isModalOpen = false" 
      @refresh="$emit('refresh')" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { gitliteStatus, gitliteDb } from '../services/gitliteDb';
import GitLiteModal from './GitLiteModal.vue';
import { useToast } from '../composables/useToast';

const emit = defineEmits<{
  (e: 'refresh'): void;
}>();

const toast = useToast();

const isModalOpen = ref(false);
const isQuickSyncing = ref(false);

async function handleQuickSync() {
  if (isQuickSyncing.value) return;
  isQuickSyncing.value = true;
  try {
    const res = await gitliteDb.syncNow();
    emit('refresh');
    toast.success(res.message);
  } catch (err: any) {
    toast.error(`同步失败: ${err.message || err}`);
  } finally {
    isQuickSyncing.value = false;
  }
}



const capsuleClasses = computed(() => {
  if (gitliteStatus.syncState === 'syncing') {
    return 'bg-amber-950/30 border-amber-500/40 text-amber-200 hover:border-amber-500/60';
  }
  if (gitliteStatus.provider !== 'memory') {
    return 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200 hover:border-emerald-500/60';
  }
  return 'bg-neutral-800/80 border-neutral-700/80 text-neutral-200 hover:border-neutral-600';
});

const dotClasses = computed(() => {
  if (gitliteStatus.syncState === 'syncing') return 'bg-amber-400';
  if (gitliteStatus.provider !== 'memory') return 'bg-emerald-400';
  return 'bg-neutral-400';
});

const pillClasses = computed(() => {
  if (gitliteStatus.syncState === 'syncing') return 'bg-amber-500/20 text-amber-300';
  if (gitliteStatus.provider !== 'memory') return 'bg-emerald-500/20 text-emerald-300';
  return 'bg-neutral-700/60 text-neutral-400';
});

const providerText = computed(() => {
  if (gitliteStatus.provider === 'github') return 'GitHub';
  if (gitliteStatus.provider === 'gitee') return 'Gitee';
  return 'Local';
});

const syncText = computed(() => {
  if (gitliteStatus.syncState === 'syncing') return 'Syncing';
  if (gitliteStatus.provider !== 'memory') return 'Live';
  return 'Ready';
});
</script>
