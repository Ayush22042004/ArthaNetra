import './ArthaNetraLogo.css'

interface ArthaNetraLogoProps {
  className?: string
  showWordmark?: boolean
  compact?: boolean
}

const ArthaNetraLogo = ({
  className = '',
  showWordmark = true,
  compact = false,
}: ArthaNetraLogoProps) => (
  <span className={`arthanetra-logo ${compact ? 'arthanetra-logo--compact' : ''} ${className}`.trim()}>
    <svg
      className="arthanetra-logo__mark"
      viewBox="0 0 96 64"
      role="img"
      aria-label="ArthaNetra logo"
      focusable="false"
    >
      <defs>
        <linearGradient id="artha-saffron-green" x1="12" y1="48" x2="82" y2="20">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="0.52" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#16803c" />
        </linearGradient>
        <linearGradient id="artha-navy" x1="20" y1="12" x2="76" y2="52">
          <stop offset="0" stopColor="#071d3a" />
          <stop offset="1" stopColor="#0f4b7a" />
        </linearGradient>
      </defs>
      <path
        d="M6 34C18 13 37 5 57 9c14 3 25 12 33 25-12-8-23-12-35-12-17 0-31 5-49 12Z"
        fill="url(#artha-navy)"
      />
      <path
        d="M7 37c15 12 31 18 49 16 13-2 24-7 34-16-14 5-26 7-38 5-15-1-29-3-45-5Z"
        fill="url(#artha-saffron-green)"
      />
      <circle cx="50" cy="32" r="18" fill="#ffffff" />
      <circle cx="50" cy="32" r="14" fill="url(#artha-navy)" />
      <path
        d="M42 24h19M42 30h18M43 24c9 0 13 3 13 8s-4 8-13 8l13 12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 25h17M15 32h20M21 39h14"
        stroke="#071d3a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M65 45V35M73 45V29M81 45V22"
        stroke="#071d3a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M65 31l8-7 8 3 8-11"
        fill="none"
        stroke="#071d3a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="65" cy="31" r="3" fill="#071d3a" />
      <circle cx="73" cy="24" r="3" fill="#071d3a" />
      <circle cx="81" cy="27" r="3" fill="#071d3a" />
      <circle cx="89" cy="16" r="3" fill="#071d3a" />
    </svg>
    {showWordmark && (
      <span className="arthanetra-logo__wordmark">
        <strong>Artha<span>Netra</span></strong>
        {!compact && <em>MPLADS project monitoring</em>}
      </span>
    )}
  </span>
)

export default ArthaNetraLogo
