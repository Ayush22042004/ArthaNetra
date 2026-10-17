export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'arthanetra-theme'

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

export const resolveTheme = (preference: ThemePreference, systemDark: boolean): ResolvedTheme =>
  preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

export const readThemePreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'light'
  } catch {
    return 'light'
  }
}

export const applyTheme = (theme: ResolvedTheme) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#101618' : '#f7fafc')
}
