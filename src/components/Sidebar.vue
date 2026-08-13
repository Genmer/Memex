<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Folder, Database, Code, Settings, ChevronRight, Zap, Globe, Package, Pin } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  uniqueSources: string[],
  pinnedSources?: string[]
}>()

const emit = defineEmits(['select', 'toggle-pin'])
const { t, toggleLanguage } = useI18n()

const menu = computed(() => {
  const base = [
    {
      id: 'core',
      name: t('sidebar.coreSystem'),
      icon: Settings,
      isGroup: true,
      isPinned: false,
      children: [
        { id: 'dashboard', name: t('sidebar.dashboard') },
        { id: 'settings', name: t('sidebar.settings') }
      ]
    }
  ]

  const pinnedList = props.pinnedSources || []
  
  const sources = (props.uniqueSources || [])
    .map(source => {
      let icon = Code
      if (source === 'claude') icon = Database
      if (source === 'hermes' || source === 'agents') icon = Folder
      if (source === 'codebuddy') icon = Package

      return {
        id: source,
        name: source.charAt(0).toUpperCase() + source.slice(1),
        icon: icon,
        isGroup: false, // Not a core group, allows pinning
        isPinned: pinnedList.includes(source),
        children: [
          { id: `${source}-skills`, name: t('sidebar.skills') },
          { id: `${source}-memories`, name: t('sidebar.memories') }
        ]
      }
    })
    
  // Sort sources: Pinned first, then alphabetical
  sources.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.name.localeCompare(b.name);
  })

  const end = [
    {
      id: 'memex',
      name: t('sidebar.memexNative'),
      icon: Zap,
      isGroup: true,
      isPinned: false,
      children: [
        { id: 'memex-skills', name: t('sidebar.skills') }
      ]
    }
  ]

  return [...base, ...sources, ...end]
})

const expanded = ref<Record<string, boolean>>({
  'core': true,
  'zcode': true,
  'claude': true
})

// Auto-expand new sources
watch(() => props.uniqueSources, (newSources) => {
  if (newSources) {
    newSources.forEach(s => {
      if (expanded.value[s] === undefined) {
        expanded.value[s] = true
      }
    })
  }
}, { immediate: true })

const activeItem = ref('dashboard')

const toggleGroup = (id: string) => {
  expanded.value[id] = !expanded.value[id]
}

const selectItem = (id: string) => {
  activeItem.value = id
  emit('select', id)
}
</script>

<template>
  <div class="w-64 h-screen flex flex-col bg-white/5 backdrop-blur-3xl border-r border-white/10 shrink-0">
    <!-- Header -->
    <div class="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
      <div class="flex items-center">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg text-sm mr-3">
          M
        </div>
        <span class="font-semibold text-lg tracking-wide text-white/90">{{ t('app.title') }}</span>
      </div>
      <button @click="toggleLanguage" class="text-white/40 hover:text-white/80 transition-colors" title="Toggle Language">
        <Globe :size="16" />
      </button>
    </div>

    <!-- Scrollable Menu -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <div v-for="group in menu" :key="group.id" class="space-y-1">
        <div 
          @click="toggleGroup(group.id)"
          class="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-white/50 hover:text-white/80 cursor-pointer transition-colors uppercase tracking-wider group"
        >
          <div class="flex items-center gap-2">
            <component :is="group.icon" :size="14" />
            {{ group.name }}
          </div>
          <div class="flex items-center gap-1.5">
            <button 
              v-if="!group.isGroup" 
              @click.stop="emit('toggle-pin', group.id)" 
              class="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 p-0.5 rounded"
              :class="{ 'opacity-100 text-indigo-400': group.isPinned, 'hover:bg-white/10': !group.isPinned }"
              :title="group.isPinned ? 'Unpin' : 'Pin to top'"
            >
              <Pin :size="12" :class="{ 'fill-current': group.isPinned }" />
            </button>
            <ChevronRight 
              :size="14" 
              class="transition-transform duration-200"
              :class="{ 'rotate-90': expanded[group.id] }"
            />
          </div>
        </div>
        
        <div v-show="expanded[group.id]" class="space-y-0.5 pt-1">
          <div 
            v-for="child in group.children" 
            :key="child.id"
            @click="selectItem(child.id)"
            class="px-8 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200"
            :class="[
              activeItem === child.id 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                : 'text-white/60 hover:text-white/90 hover:bg-white/5 border border-transparent'
            ]"
          >
            {{ child.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
