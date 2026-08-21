/**
 * 清除本地快照、缓存并强制重新从远端载入最新版本
 */
export function clearCacheAndHardReload() {
  if (confirm('确定清空本地离线快照并强制刷新载入最新版？')) {
    try {
      // 1. 保留关键登录凭据
      const token = localStorage.getItem('memex_gitlite_token')
      const provider = localStorage.getItem('memex_gitlite_provider')
      const owner = localStorage.getItem('memex_gitlite_owner')
      const repo = localStorage.getItem('memex_gitlite_repo')
      const db = localStorage.getItem('memex_gitlite_db')

      // 2. 清空缓存与快照
      localStorage.clear()
      sessionStorage.clear()

      // 3. 恢复关键凭据
      if (token) localStorage.setItem('memex_gitlite_token', token)
      if (provider) localStorage.setItem('memex_gitlite_provider', provider)
      if (owner) localStorage.setItem('memex_gitlite_owner', owner)
      if (repo) localStorage.setItem('memex_gitlite_repo', repo)
      if (db) localStorage.setItem('memex_gitlite_db', db)

      // 4. 清除 Cache API (Service Worker 缓存)
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(k => caches.delete(k))
        })
      }
    } catch (e) {
      console.warn('[Cache] clear error:', e)
    }

    // 5. 强制带时间戳重载，绕过浏览器本地资源强缓存
    const freshUrl = window.location.origin + window.location.pathname + '?_t=' + Date.now()
    window.location.href = freshUrl
  }
}
