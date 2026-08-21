<template>
  <div 
    @click="openModal"
    class="w-full px-3.5 sm:px-6 py-1.5 border-b text-xs flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 select-none backdrop-blur-md"
    :class="bannerStyles.bgClass"
  >
    <!-- Left: Status Icon & Live Description -->
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <!-- Live Indicator Dot / Spinner -->
      <div class="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        <span 
          v-if="gitliteStatus.syncState === 'syncing' || gitliteStatus.isConnecting" 
          class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          :class="bannerStyles.pingClass"
        ></span>
        <span 
          class="relative inline-flex rounded-full h-2 w-2"
          :class="bannerStyles.dotClass"
        ></span>
      </div>

      <!-- Realtime Status Text -->
      <div class="flex items-center gap-2 min-w-0 truncate">
        <span class="font-semibold shrink-0" :class="bannerStyles.titleClass">
          {{ bannerStyles.title }}
        </span>
        <span class="text-white/30 text-[10px] shrink-0 font-mono">|</span>
        <span class="text-[11px] truncate" :class="bannerStyles.descClass">
          {{ liveStatusText }}
        </span>
      </div>
    </div>

    <!-- Right: Action Button & Sync Time -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Last Synced Time / Changes Pill -->
      <span 
        v-if="gitliteStatus.lastSyncedAt && gitliteStatus.provider !== 'memory'" 
        class="text-[10px] font-mono text-white/40 hidden sm:inline"
      >
        上次通信: {{ gitliteStatus.lastSyncedAt }}
      </span>

      <!-- Action Button -->
      <button 
        @click.stop="handleBannerAction"
        class="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm active:scale-95 border"
        :class="bannerStyles.btnClass"
      >
        <svg 
          v-if="gitliteStatus.syncState === 'syncing' || gitliteStatus.isConnecting || isActionLoading"
          class="w-3 h-3 animate-spin" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ bannerStyles.btnText }}</span>
      </button>
    </div>

    <GitLiteModal 
      :is-open="isModalOpen" 
      @close="isModalOpen = false" 
      @refresh="$emit('refresh')" 
    />
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
const isActionLoading = ref(false);

function openModal() {
  isModalOpen.value = true;
}

async function handleBannerAction() {
  if (gitliteStatus.provider === 'memory') {
    // 未连接云端，打开配置弹窗
    isModalOpen.value = true;
    return;
  }

  // 已连接云端，触发主动同步
  if (isActionLoading.value || gitliteStatus.syncState === 'syncing') return;
  isActionLoading.value = true;
  try {
    const res = await gitliteDb.syncNow();
    emit('refresh');
    toast.success(res.message);
  } catch (err: any) {
    toast.error(`同步失败: ${err.message || err}`);
  } finally {
    isActionLoading.value = false;
  }
}

const liveStatusText = computed(() => {
  if (gitliteStatus.isConnecting || gitliteStatus.syncState === 'syncing') {
    return gitliteStatus.statusMessage || '正在与远程 Git 仓库交换数据...';
  }
  if (gitliteStatus.error) {
    return `连接异常: ${gitliteStatus.error} (已自动切回本地缓存)`;
  }
  if (gitliteStatus.provider === 'gitee') {
    return `已连接 Gitee (${gitliteStatus.owner}/${gitliteStatus.repo}) · 双向实时同步已生效`;
  }
  if (gitliteStatus.provider === 'github') {
    return `已连接 GitHub (${gitliteStatus.owner}/${gitliteStatus.repo}) · 双向实时同步已生效`;
  }
  return '当前为本地离线模式，数据仅保存在当前设备，建议绑定 Gitee 开启多端同步';
});

const bannerStyles = computed(() => {
  if (gitliteStatus.isConnecting || gitliteStatus.syncState === 'syncing') {
    return {
      bgClass: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
      pingClass: 'bg-amber-400',
      dotClass: 'bg-amber-400 animate-pulse',
      title: '🔄 云端数据同步中',
      titleClass: 'text-amber-300 font-bold',
      descClass: 'text-amber-200/90 font-mono',
      btnText: '同步中...',
      btnClass: 'bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30'
    };
  }

  if (gitliteStatus.error) {
    return {
      bgClass: 'bg-rose-950/40 border-rose-500/30 text-rose-200',
      pingClass: 'bg-rose-400',
      dotClass: 'bg-rose-400',
      title: '⚠️ 云端通信异常',
      titleClass: 'text-rose-300 font-bold',
      descClass: 'text-rose-200/80',
      btnText: '重试连接',
      btnClass: 'bg-rose-500/20 text-rose-200 border-rose-500/30 hover:bg-rose-500/30'
    };
  }

  if (gitliteStatus.provider !== 'memory') {
    return {
      bgClass: 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200',
      pingClass: 'bg-emerald-400',
      dotClass: 'bg-emerald-400',
      title: '🟢 远程已连接',
      titleClass: 'text-emerald-300 font-bold',
      descClass: 'text-emerald-100/90',
      btnText: '立即同步',
      btnClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/30'
    };
  }

  return {
    bgClass: 'bg-white/[0.02] border-white/5 text-neutral-300',
    pingClass: 'bg-neutral-400',
    dotClass: 'bg-neutral-400',
    title: '💾 本地离线模式',
    titleClass: 'text-neutral-200 font-medium',
    descClass: 'text-neutral-400',
    btnText: '连接云端',
    btnClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30 hover:bg-indigo-500/30'
  };
});
</script>
