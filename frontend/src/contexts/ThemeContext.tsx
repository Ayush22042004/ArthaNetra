import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
  type ResolvedTheme,
} from '../utils/theme'

const ThemeContext = createContext<{
  preference: ThemePreference
  theme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
} | null>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const theme = resolveTheme(preference, systemDark)

  useLayoutEffect(() => applyTheme(theme), [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => setSystemDark(media.matches)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null)
        setPreferenceState(readThemePreference())
    }
    media.addEventListener('change', handleSystemChange)
    window.addEventListener('storage', handleStorage)
    handleSystemChange()
    return () => {
      media.removeEventListener('change', handleSystemChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // The selected theme still works when browser storage is unavailable.
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme requires ThemeProvider')
  return context
}
