import { useRef, useState } from 'react'
import {
  FiAlertCircle,
  FiCamera,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiImage,
  FiLoader,
  FiLock,
  FiMapPin,
  FiShield,
  FiUnlock,
} from 'react-icons/fi'
import './FieldTestingAccess.css'

type Props = {
  unlocked: boolean
  expiresAt: string
  password: string
  error: string
  busy: boolean
  submitting: boolean
  onPasswordChange: (value: string) => void
  onUnlock: () => Promise<void>
  onLock: () => void
  onSample: (kind: string) => Promise<void>
}

export default function FieldTestingAccess({
  unlocked,
  expiresAt,
  password,
  error,
  busy,
  submitting,
  onPasswordChange,
  onUnlock,
  onLock,
  onSample,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const [pendingSample, setPendingSample] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const disabled = busy || submitting
  const sample = async (kind: string) => {
    if (disabled) return
    setPendingSample(kind)
    try {
      await onSample(kind)
    } finally {
      setPendingSample('')
    }
  }
  const actions = [
    { kind: 'gps', label: 'Simulate site GPS', icon: FiMapPin },
    { kind: 'construction', label: 'Construction sample', icon: FiCamera },
    { kind: 'unrelated', label: 'Unrelated image test', icon: FiImage },
  ]
  return (
    <section
      className={`test-access${unlocked ? ' test-access--active' : ''}`}
      aria-label="Testing access"
    >
      {unlocked ? (
        <>
          <header className="test-access__header">
            <span className="test-access__icon">
              <FiShield aria-hidden="true" />
            </span>
            <div className="test-access__heading">
              <strong>Sandbox session</strong>
              <span>Simulated evidence</span>
            </div>
            <span className="test-access__badge">
              <i /> Active
            </span>
            <button
              className="test-access__icon-button"
              type="button"
              aria-label="Lock testing"
              title="Lock testing"
              disabled={disabled}
              onClick={() => {
                setShowPassword(false)
                onLock()
              }}
            >
              <FiLock />
            </button>
          </header>
          <div className="test-access__actions">
            {actions.map(({ kind, label, icon: Icon }) => (
              <button
                key={kind}
                type="button"
                disabled={disabled}
                onClick={() => sample(kind)}
                aria-busy={pendingSample === kind}
              >
                {pendingSample === kind ? <FiLoader className="test-access__spinner" /> : <Icon />}
                <span>{label}</span>
              </button>
            ))}
          </div>
          <footer className="test-access__footer">
            <span>
              <FiShield /> Live records unchanged
            </span>
            {expiresAt && (
              <time dateTime={expiresAt}>
                Locks at{' '}
                {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            )}
          </footer>
        </>
      ) : (
        <details
          onToggle={event => {
            if (event.currentTarget.open) input.current?.focus({ preventScroll: true })
          }}
        >
          <summary className="test-access__header">
            <span className="test-access__icon">
              <FiLock aria-hidden="true" />
            </span>
            <div className="test-access__heading">
              <strong>Password-locked testing</strong>
              <span>Restricted sandbox</span>
            </div>
            <span className="test-access__badge">Locked</span>
            <FiChevronDown className="test-access__chevron" aria-hidden="true" />
          </summary>
          <div className="test-access__unlock">
            <label htmlFor="field-testing-password">Testing password</label>
            <div className={`test-access__password${error ? ' test-access__password--error' : ''}`}>
              <FiLock aria-hidden="true" />
              <input
                ref={input}
                id="field-testing-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter testing password"
                value={password}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'field-testing-error' : undefined}
                disabled={disabled}
                onChange={event => onPasswordChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (password && !disabled) void onUnlock()
                  }
                }}
              />
              <button
                type="button"
                className="test-access__icon-button"
                aria-label={showPassword ? 'Hide testing password' : 'Show testing password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={disabled}
                onClick={() => setShowPassword(value => !value)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {error && (
              <p id="field-testing-error" className="test-access__error" role="alert">
                <FiAlertCircle /> {error}
              </p>
            )}
            <button
              type="button"
              className="test-access__unlock-button"
              disabled={disabled || !password}
              onClick={() => void onUnlock()}
            >
              {busy ? <FiLoader className="test-access__spinner" /> : <FiUnlock />}
              {busy ? 'Unlocking...' : 'Unlock testing'}
            </button>
          </div>
        </details>
      )}
    </section>
  )
}
