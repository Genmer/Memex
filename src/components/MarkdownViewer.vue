<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { Copy, Code, Eye } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const props = defineProps<{
  content: string
}>()

const toast = useToast()
const viewType = ref<'rendered' | 'raw'>('rendered')

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true
})

const renderedHtml = computed(() => {
  if (!props.content) return ''
  try {
    return marked.parse(props.content) as string
  } catch {
    return props.content
  }
})

const copyRawContent = async () => {
  try {
    await navigator.clipboard.writeText(props.content)
    toast.success('已复制全部内容')
  } catch (err) {
    toast.error('复制失败: ' + err)
  }
}

// Global delegated click for code block copying
const handleContainerClick = async (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const copyBtn = target.closest('.copy-code-btn') as HTMLElement
  if (copyBtn) {
    const codeBlock = copyBtn.closest('.code-block-wrapper')?.querySelector('code')
    if (codeBlock) {
      const codeText = codeBlock.textContent || ''
      try {
        await navigator.clipboard.writeText(codeText)
        const origHtml = copyBtn.innerHTML
        copyBtn.innerHTML = '<span class="text-emerald-500 dark:text-emerald-400 text-xs flex items-center gap-1">已复制 ✓</span>'
        setTimeout(() => {
          copyBtn.innerHTML = origHtml
        }, 2000)
      } catch (err) {
        toast.error('复制失败: ' + err)
      }
    }
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- View Switcher & Action bar -->
    <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-white/5">
      <div class="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-0.5 border border-slate-200 dark:border-white/10">
        <button
          @click="viewType = 'rendered'"
          class="px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5"
          :class="viewType === 'rendered' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'"
        >
          <Eye :size="13" />
          <span>富文本渲染</span>
        </button>
        <button
          @click="viewType = 'raw'"
          class="px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5"
          :class="viewType === 'raw' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'"
        >
          <Code :size="13" />
          <span>原始 Markdown</span>
        </button>
      </div>

      <button
        @click="copyRawContent"
        class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-medium transition-colors flex items-center gap-1.5"
        title="复制全部内容"
      >
        <Copy :size="13" />
        <span>复制全文</span>
      </button>
    </div>

    <!-- Rendered Markdown View -->
    <div 
      v-if="viewType === 'rendered'"
      class="markdown-body text-slate-800 dark:text-white/90 text-sm leading-relaxed space-y-3 select-text"
      v-html="renderedHtml"
      @click="handleContainerClick"
    ></div>

    <!-- Raw Plaintext View -->
    <div v-else class="bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-slate-200/80 dark:border-white/5 shadow-inner">
      <pre class="text-sm font-mono text-slate-800 dark:text-white/80 whitespace-pre-wrap leading-relaxed break-words">{{ content }}</pre>
    </div>
  </div>
</template>

<style>
/* Markdown styling */
.markdown-body {
  font-family: inherit;
}
.markdown-body h1 {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid rgba(150, 150, 150, 0.2);
}
.markdown-body h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.4rem;
}
.markdown-body h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.3rem;
}
.markdown-body p {
  margin-bottom: 0.6rem;
  line-height: 1.6;
}
.markdown-body ul, .markdown-body ol {
  padding-left: 1.25rem;
  margin-bottom: 0.6rem;
}
.markdown-body ul {
  list-style-type: disc;
}
.markdown-body ol {
  list-style-type: decimal;
}
.markdown-body li {
  margin-bottom: 0.25rem;
}
.markdown-body pre {
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.825rem;
  line-height: 1.5;
  margin: 0.75rem 0;
  position: relative;
}
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.825rem;
  padding: 0.15rem 0.35rem;
  border-radius: 0.35rem;
}
.markdown-body pre code {
  background-color: transparent;
  padding: 0;
}
.markdown-body blockquote {
  border-left: 3px solid #6366f1;
  padding-left: 0.85rem;
  margin: 0.6rem 0;
  font-style: italic;
}
.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.85rem;
}
.markdown-body th, .markdown-body td {
  padding: 0.4rem 0.75rem;
  text-align: left;
}
.markdown-body th {
  font-weight: 600;
}
.markdown-body hr {
  border: none;
  border-top: 1px solid rgba(150, 150, 150, 0.2);
  margin: 1rem 0;
}
.markdown-body a {
  color: #4f46e5;
  text-decoration: underline;
  text-underline-offset: 2px;
}
html.dark .markdown-body a {
  color: #818cf8;
}

/* Light Theme Markdown Colors */
html.light .markdown-body h1,
html.light .markdown-body h2,
html.light .markdown-body h3 {
  color: #0f172a;
}
html.light .markdown-body p,
html.light .markdown-body li {
  color: #334155;
}
html.light .markdown-body pre {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}
html.light .markdown-body code {
  background-color: #f1f5f9;
  color: #4338ca;
  border: 1px solid #e2e8f0;
}
html.light .markdown-body pre code {
  color: #0f172a;
  border: none;
}
html.light .markdown-body blockquote {
  color: #64748b;
}
html.light .markdown-body th,
html.light .markdown-body td {
  border: 1px solid #e2e8f0;
}
html.light .markdown-body th {
  background-color: #f1f5f9;
  color: #1e293b;
}

/* Dark Theme Markdown Colors */
html.dark .markdown-body h1 { color: #f3f4f6; }
html.dark .markdown-body h2 { color: #e5e7eb; }
html.dark .markdown-body h3 { color: #d1d5db; }
html.dark .markdown-body p { color: rgba(255, 255, 255, 0.85); }
html.dark .markdown-body li { color: rgba(255, 255, 255, 0.8); }
html.dark .markdown-body pre {
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
html.dark .markdown-body code {
  background-color: rgba(255, 255, 255, 0.08);
  color: #a5b4fc;
}
html.dark .markdown-body pre code {
  color: rgba(255, 255, 255, 0.9);
}
html.dark .markdown-body blockquote {
  color: rgba(255, 255, 255, 0.65);
}
html.dark .markdown-body th,
html.dark .markdown-body td {
  border: 1px solid rgba(255, 255, 255, 0.1);
}
html.dark .markdown-body th {
  background-color: rgba(255, 255, 255, 0.05);
  color: #e0e7ff;
}
</style>
