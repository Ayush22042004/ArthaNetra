import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import './AppearanceMenu.css'

const modes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

const AppearanceMenu = ({ className = '' }: { className?: string }) => {
  const { preference, theme, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const Icon = preference === 'system' ? Monitor : theme === 'dark' ? Moon : Sun

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const selected = container.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
    selected?.focus()
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  const closeMenu = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const handleKeys = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      closeMenu()
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const items = Array.from(
        container.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []
      )
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next]?.focus()
    } else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className={`appearance-menu ${className}`} ref={container}>
      <button
        ref={trigger}
        className="appearance-trigger"
        type="button"
        title={`Appearance: ${preference}`}
        aria-label="Appearance"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <Icon size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="appearance-options"
          id={menuId}
          role="menu"
          aria-label="Color theme"
          onKeyDown={handleKeys}
        >
          <span className="appearance-label">Appearance</span>
          {modes.map(mode => (
            <button
              key={mode.value}
              role="menuitemradio"
              aria-checked={preference === mode.value}
              type="button"
              onClick={() => {
                setPreference(mode.value)
                closeMenu()
              }}
            >
              <mode.icon size={16} aria-hidden="true" />
              <span>{mode.label}</span>
              {preference === mode.value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const StandaloneAppearance = () => {
  const { pathname } = useLocation()
  if (pathname === '/' || pathname.startsWith('/mplads')) return null
  return <AppearanceMenu className="appearance-menu--standalone" />
}

export default AppearanceMenu
