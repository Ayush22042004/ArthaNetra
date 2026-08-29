import { FiCheckCircle, FiClock, FiLock, FiShield } from 'react-icons/fi'
import './FundReleaseTimeline.css'

interface FundReleaseTimelineProps {
  totalFunds: number
  progress: number
}

const formatFunds = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value || 0)

const stages = [
  { name: 'Survey verified', threshold: 0, release: 25, icon: FiCheckCircle },
  { name: 'Work execution', threshold: 35, release: 35, icon: FiClock },
  { name: 'Midline evidence', threshold: 70, release: 25, icon: FiShield },
  { name: 'Closure audit', threshold: 95, release: 15, icon: FiLock },
]

const FundReleaseTimeline = ({ totalFunds, progress }: FundReleaseTimelineProps) => {
  return (
    <section className="fund-release-card" aria-label="Milestone based fund release">
      <div className="fund-release-header">
        <div>
          <span className="eyebrow">Milestone finance</span>
          <h3>Fund release ladder</h3>
        </div>
        <strong>{formatFunds(totalFunds)}</strong>
      </div>

      <div className="fund-release-grid">
        {stages.map(stage => {
          const Icon = stage.icon
          const unlocked = progress >= stage.threshold
          const active = progress >= stage.threshold && progress < stage.threshold + stage.release

          return (
            <article
              key={stage.name}
              className={`fund-stage ${unlocked ? 'unlocked' : 'locked'} ${active ? 'active' : ''}`}
            >
              <div className="fund-stage-icon">
                <Icon />
              </div>
              <div>
                <strong>{stage.name}</strong>
                <span>{stage.release}% release</span>
                <em>{formatFunds((totalFunds * stage.release) / 100)}</em>
              </div>
              <b>{unlocked ? 'Available' : `Locks until ${stage.threshold}%`}</b>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FundReleaseTimeline
