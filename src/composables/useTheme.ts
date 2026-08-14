import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'auto'

const themeMode = ref<ThemeMode>((localStorage.getItem('memex_theme') as ThemeMode) || 'dark')
const isDark = ref(true)

export function useTheme() {
  const updateActualTheme = () => {
    let dark = true
    if (themeMode.value === 'dark') {
      dark = true
    } else if (themeMode.value === 'light') {
      dark = false
    } else {
      dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    isDark.value = dark
    
    if (dark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }

  const setThemeMode = (mode: ThemeMode) => {
    themeMode.value = mode
    localStorage.setItem('memex_theme', mode)
    updateActualTheme()
  }

  const initTheme = () => {
    updateActualTheme()
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (themeMode.value === 'auto') {
          updateActualTheme()
        }
      })
    }
  }

  return {
    themeMode,
    isDark,
    setThemeMode,
    initTheme
  }
}
