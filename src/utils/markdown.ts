import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

// Custom renderer for marked with clean syntax highlighting (no top title header)
const renderer = new marked.Renderer()

renderer.code = function({ text, lang }: { text: string, lang?: string }) {
  const language = (lang || '').trim().toLowerCase()
  let highlighted = ''
  if (language && hljs.getLanguage(language)) {
    try {
      highlighted = hljs.highlight(text, { language }).value
    } catch {
      highlighted = text
    }
  } else {
    try {
      highlighted = hljs.highlightAuto(text).value
    } catch {
      highlighted = text
    }
  }
  const displayLang = language || 'plaintext'
  return `<div class="code-block-wrapper relative my-2.5 rounded-xl overflow-hidden border group">
    <div class="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 select-none pointer-events-auto">
      <span class="code-lang-tag px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider">${displayLang}</span>
      <button class="copy-code-btn px-2 py-0.5 rounded text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm">
        <span>复制</span>
      </button>
    </div>
    <pre class="code-block-pre p-3.5 overflow-x-auto text-xs leading-relaxed font-mono"><code>${highlighted}</code></pre>
  </div>`
}

marked.use({
  renderer,
  gfm: true,
  breaks: true
})

export const renderMarkdown = (content: string): string => {
  if (!content) return ''
  try {
    return marked.parse(content) as string
  } catch (e) {
    console.error('Markdown parse error:', e)
    return content
  }
}

export const copyCodeFromClick = async (event: MouseEvent): Promise<boolean> => {
  const target = event.target as HTMLElement
  const copyBtn = target.closest('.copy-code-btn') as HTMLElement
  if (copyBtn) {
    const wrapper = copyBtn.closest('.code-block-wrapper')
    const codeEl = wrapper?.querySelector('code')
    if (codeEl) {
      const codeText = codeEl.textContent || ''
      try {
        await navigator.clipboard.writeText(codeText)
        const origHtml = copyBtn.innerHTML
        copyBtn.innerHTML = '<span class="text-emerald-400 font-bold">已复制 ✓</span>'
        setTimeout(() => {
          copyBtn.innerHTML = origHtml
        }, 1800)
        return true
      } catch (err) {
        console.error('Failed to copy code:', err)
      }
    }
  }
  return false
}

export const extractCleanTitle = (text: string): string => {
  if (!text) return ''
  let cleaned = text.replace(/^```[a-zA-Z0-9_-]*\r?\n?/, '')
  cleaned = cleaned.replace(/\r?\n?```\s*$/, '')
  cleaned = cleaned.replace(/^#+\s+/, '').replace(/^>\s+/, '').replace(/^-\s+(\[[ x]\]\s+)?/, '').trim()
  const firstLine = cleaned.split('\n').map((l: string) => l.trim()).find((l: string) => l.length > 0) || ''
  return firstLine.slice(0, 40).trim() || '未命名备忘'
}
