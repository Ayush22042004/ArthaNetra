import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  FileText,
  Landmark,
  Map,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import './Home.css'
import MailingListForm from './MPLADS/components/Common/MailingListForm'
import ArthaNetraLogo from './common/ArthaNetraLogo'
import SiteFooter from './common/SiteFooter'
import { Button } from '@/components/ui/button'

const metrics = [
  { label: 'Funds tracked', value: '5,000+ Cr', icon: Landmark },
  { label: 'MP records', value: '1,317', icon: Users },
  { label: 'States and UTs', value: '38', icon: Map },
  { label: 'Works indexed', value: '2L+', icon: FileText },
]

const platformLinks = [
  {
    title: 'Command Center',
    text: 'National and constituency-level health across allocation, spending, completion, and payment gaps.',
    href: '/mplads',
    icon: BarChart3,
  },
  {
    title: 'Risk Intelligence',
    text: 'Find delayed works, zero-utilization records, weather-linked risk, and release blockers.',
    href: '/mplads/risk-analysis',
    icon: ShieldAlert,
  },
  {
    title: 'GIS Map',
    text: 'Review mapped works, road-related projects, risk color, and constituency context.',
    href: '/mplads/map',
    icon: Map,
  },
  {
    title: 'Project Search',
    text: 'Open any work record and inspect MP, constituency, amount, status, and payments.',
    href: '/mplads/track-area',
    icon: Search,
  },
]

const monitoringFlow = [
  'Work file: MP, constituency, amount, category, status, and agency',
  'Fund trail: sanction level, installments, payment success, and release gaps',
  'Risk check: utilization, delay, contractor signal, and weather context',
  'Field action: map review, verification, escalation, and report follow-up',
]

function Home() {
  return (
    <div className="home-page">
      <section className="home-hero" aria-label="ArthaNetra overview">
        <div className="home-hero__nav">
          <ArthaNetraLogo />
          <Link to="/mplads" className="home-hero__nav-link">
            Open Platform
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="home-hero__grid">
          <div className="home-hero__copy">
            <span className="home-kicker">
              <Sparkles size={15} />
              MPLADS project monitoring
            </span>
            <h1>Track works, funds, risk, and payments from one control room.</h1>
            <p>
              ArthaNetra helps teams inspect MPLADS work records, fund movement, contractor
              signals, weather risk, map location, and payment history without jumping across
              scattered screens.
            </p>
            <div className="home-actions">
              <Link to="/mplads">
                <Button className="home-primary-btn">
                  Launch MPLADS Platform
                  <ArrowRight size={17} />
                </Button>
              </Link>
              <Link to="/mplads/map">
                <Button variant="outline" className="home-secondary-btn">
                  View Intelligence Map
                </Button>
              </Link>
            </div>
          </div>

          <aside className="home-hero__console" aria-label="Live project monitoring summary">
            <div className="console-header">
              <span>Live Work Review</span>
              <strong>Active</strong>
            </div>
            <div className="console-score">
              <span>Current focus</span>
              <strong>Work-level</strong>
            </div>
            <div className="console-map">
              <svg viewBox="0 0 520 360" role="img" aria-label="India project risk map">
                <defs>
                  <linearGradient id="india-map-fill" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#e0f2fe" />
                    <stop offset="54%" stopColor="#d9f6ef" />
                    <stop offset="100%" stopColor="#fff7ed" />
                  </linearGradient>
                </defs>
                <path
                  className="india-shape"
                  d="M186 34 L214 56 L246 50 L277 69 L314 66 L345 92 L341 126 L370 146 L355 178 L372 214 L348 231 L343 263 L315 268 L300 308 L270 333 L244 305 L228 271 L204 251 L178 252 L164 221 L132 210 L116 178 L90 167 L102 136 L88 108 L121 94 L135 63 Z"
                />
                <path
                  className="india-route"
                  d="M140 112 C188 108 205 143 231 153 C263 166 305 147 341 176 C320 209 280 214 248 205 C218 197 192 224 158 203"
                />
                <path
                  className="india-route india-route--secondary"
                  d="M216 58 C226 105 223 154 238 194 C249 226 267 261 270 318"
                />
                <circle className="india-node india-node--high" cx="155" cy="122" r="11" />
                <circle className="india-node india-node--medium" cx="224" cy="166" r="11" />
                <circle className="india-node india-node--low" cx="293" cy="214" r="11" />
                <circle className="india-node india-node--high" cx="309" cy="151" r="11" />
                <circle className="india-node india-node--medium" cx="248" cy="285" r="11" />
                <g className="india-label">
                  <rect x="306" y="86" width="118" height="52" rx="12" />
                  <text x="322" y="108">124 high risk</text>
                  <text x="322" y="126">works flagged</text>
                </g>
              </svg>
            </div>
            <div className="console-list">
              <p>
                <ShieldAlert size={16} />
                Zero-utilization and pending works are separated before field review.
              </p>
              <p>
                <BellRing size={16} />
                Fund release stages show what is paid and what needs milestone evidence.
              </p>
              <p>
                <CheckCircle2 size={16} />
                The assistant reads the active page, selected MP, project, or payment modal.
              </p>
            </div>
          </aside>
        </div>

        <div className="home-metrics" aria-label="Platform metrics">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <div className="home-metric" key={metric.label}>
                <Icon size={20} />
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="home-section home-section--platforms">
        <div className="home-section__header">
          <span>Workflows</span>
          <h2>Start from a work record, then move to evidence.</h2>
          <p>
            Each module answers a practical monitoring question: what was sanctioned, what was
            paid, where is the work, who is responsible, and what needs attention now?
          </p>
        </div>

        <div className="platform-grid">
          {platformLinks.map(item => {
            const Icon = item.icon
            return (
              <Link to={item.href} className="platform-card" key={item.title}>
                <Icon size={24} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span>
                  Open
                  <ArrowRight size={15} />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="home-section home-section--stack">
        <div className="stack-panel">
          <div>
            <span className="home-kicker home-kicker--dark">Monitoring model</span>
            <h2>From recommendation to verified completion.</h2>
            <p>
              ArthaNetra keeps the story of every work connected: recommendation, sanction,
              payment, milestone, map review, risk reason, and final verification.
            </p>
          </div>
          <ul>
            {monitoringFlow.map(item => (
              <li key={item}>
                <CheckCircle2 size={18} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-section home-section--updates">
        <div className="updates-card">
          <div>
            <span>Stay connected</span>
            <h2>Get ArthaNetra updates</h2>
            <p>Follow data refreshes, risk improvements, and project monitoring releases.</p>
          </div>
          <MailingListForm />
        </div>
      </section>

      <SiteFooter className="home-footer" />
    </div>
  )
}

export default Home
