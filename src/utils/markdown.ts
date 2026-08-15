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
  return `<div class="code-block-wrapper relative my-2.5 rounded-xl overflow-hidden border border-white/10 bg-[#13161f] shadow-inner group">
    <div class="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 select-none pointer-events-auto">
      <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-black/60 text-purple-300/90 border border-white/10">${displayLang}</span>
      <button class="copy-code-btn px-2 py-0.5 rounded text-[10px] bg-black/60 hover:bg-purple-600/80 text-white/80 hover:text-white border border-white/10 transition-all flex items-center gap-1 cursor-pointer shadow-sm">
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
