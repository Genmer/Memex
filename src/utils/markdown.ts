import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

// Custom renderer for marked with syntax highlighting
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
  return `<div class="code-block-wrapper my-3 rounded-xl overflow-hidden border border-white/10 bg-[#161b22] shadow-lg">
    <div class="flex items-center justify-between px-3.5 py-1.5 bg-white/5 border-b border-white/5 text-xs text-white/50 font-mono select-none">
      <span class="text-[11px] font-bold uppercase tracking-wider text-purple-300/90">${displayLang}</span>
      <button class="copy-code-btn px-2 py-0.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors text-[11px] flex items-center gap-1 cursor-pointer">
        <span>复制</span>
      </button>
    </div>
    <pre class="p-3.5 overflow-x-auto text-xs leading-relaxed font-mono text-white/90"><code>${highlighted}</code></pre>
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
